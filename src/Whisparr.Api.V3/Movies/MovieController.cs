using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using System.Threading.Tasks;
using DryIoc.ImTools;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using NLog;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Datastore.Events;
using NzbDrone.Core.DecisionEngine.Specifications;
using NzbDrone.Core.MediaCover;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Movies;
using NzbDrone.Core.Movies.Commands;
using NzbDrone.Core.Movies.Events;
using NzbDrone.Core.MovieStats;
using NzbDrone.Core.Parser;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Validation;
using NzbDrone.Core.Validation.Paths;
using NzbDrone.SignalR;
using Whisparr.Http;
using Whisparr.Http.Extensions;
using Whisparr.Http.REST;
using Whisparr.Http.REST.Attributes;

namespace Whisparr.Api.V3.Movies
{
    [V3ApiController]
    public class MovieController : RestControllerWithSignalR<MovieResource, Movie>,
                                IHandle<MovieFileImportedEvent>,
                                IHandle<MovieFileDeletedEvent>,
                                IHandle<MovieUpdatedEvent>,
                                IHandle<MovieEditedEvent>,
                                IHandle<MoviesDeletedEvent>,
                                IHandle<MovieRenamedEvent>,
                                IHandle<MoviesBulkEditedEvent>,
                                IHandle<MediaCoversUpdatedEvent>
    {
        private readonly IMovieService _moviesService;
        private readonly IAddMovieService _addMovieService;
        private readonly IMovieStatisticsService _movieStatisticsService;
        private readonly IMapCoversToLocal _coverMapper;
        private readonly IManageCommandQueue _commandQueueManager;
        private readonly IRootFolderService _rootFolderService;
        private readonly IUpgradableSpecification _qualityUpgradableSpecification;
        private readonly IConfigService _configService;
        private readonly bool _useCache;
        private readonly ICached<MovieResource> _movieResourcesCache;
        private readonly Logger _logger;
        private readonly HashSet<string> _allowedMovieSortKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "movies.added",
            "movieMetadata.itemType",
            "movies.monitored",
            "movies.path",
            "movies.qualityProfileId",
            "movieMetadata.releaseDate",
            "movieMetadata.runtime",
            "sizeOnDisk",
            "movieMetadata.sortTitle",
            "movieMetadata.status",
            "movieMetadata.studio",
            "movieMetadata.title",
            "movieMetadata.year",
        };

        public MovieController(IBroadcastSignalRMessage signalRBroadcaster,
                           IMovieService moviesService,
                           IAddMovieService addMovieService,
                           IMovieStatisticsService movieStatisticsService,
                           IMapCoversToLocal coverMapper,
                           IManageCommandQueue commandQueueManager,
                           IRootFolderService rootFolderService,
                           IUpgradableSpecification qualityUpgradableSpecification,
                           IConfigService configService,
                           RootFolderValidator<MovieResource> rootFolderValidator,
                           MappedNetworkDriveValidator<MovieResource> mappedNetworkDriveValidator,
                           MoviePathValidator<MovieResource> moviesPathValidator,
                           MovieExistsValidator<MovieResource> moviesExistsValidator,
                           MovieAncestorValidator<MovieResource> moviesAncestorValidator,
                           RecycleBinValidator<MovieResource> recycleBinValidator,
                           SystemFolderValidator<MovieResource> systemFolderValidator,
                           QualityProfileExistsValidator<MovieResource> qualityProfileExistsValidator,
                           RootFolderExistsValidator<MovieResource> rootFolderExistsValidator,
                           MovieFolderAsRootFolderValidator movieFolderAsRootFolderValidator,
                           ICacheManager cacheManager,
                           Logger logger)
            : base(signalRBroadcaster)
        {
            _moviesService = moviesService;
            _addMovieService = addMovieService;
            _movieStatisticsService = movieStatisticsService;
            _qualityUpgradableSpecification = qualityUpgradableSpecification;
            _configService = configService;
            _coverMapper = coverMapper;
            _commandQueueManager = commandQueueManager;
            _useCache = _configService.WhisparrCacheMovieAPI;
            _rootFolderService = rootFolderService;
            _logger = logger;
            _movieResourcesCache = cacheManager.GetCache<MovieResource>(typeof(MovieResource), "movieResources");

            SharedValidator.RuleFor(s => s.Path).Cascade(CascadeMode.Stop)
                .IsValidPath()
                .SetValidator(rootFolderValidator)
                .SetValidator(mappedNetworkDriveValidator)
                .SetValidator(moviesPathValidator)
                .SetValidator(moviesAncestorValidator)
                .SetValidator(recycleBinValidator)
                .SetValidator(systemFolderValidator)
                .When(s => s.Path.IsNotNullOrWhiteSpace());

            PostValidator.RuleFor(s => s.Path).Cascade(CascadeMode.Stop)
                .NotEmpty()
                .IsValidPath()
                .When(s => s.RootFolderPath.IsNullOrWhiteSpace());
            PostValidator.RuleFor(s => s.RootFolderPath).Cascade(CascadeMode.Stop)
                .NotEmpty()
                .IsValidPath()
                .SetValidator(rootFolderExistsValidator)
                .SetValidator(movieFolderAsRootFolderValidator)
                .When(s => s.Path.IsNullOrWhiteSpace());

            PutValidator.RuleFor(s => s.Path).Cascade(CascadeMode.Stop)
                .NotEmpty()
                .IsValidPath();

            SharedValidator.RuleFor(s => s.QualityProfileId).Cascade(CascadeMode.Stop)
                .ValidId()
                .SetValidator(qualityProfileExistsValidator);

            PostValidator.RuleFor(s => s.Title).NotEmpty().When(s => s.TmdbId <= 0);
            PostValidator.RuleFor(s => s.ForeignId).NotNull().NotEmpty().SetValidator(moviesExistsValidator);

            PutValidator.RuleFor(s => s.Path).IsValidPath();
        }

        // Basic search: cleanTitle or foreign ID
        // Added for SelectMovieModalContent performance but will reuse elsewhere
        [HttpGet("search")]
        [Produces("application/json")]
        public List<MovieResource> SearchMovies(string query)
        {
            var moviesResources = new List<MovieResource>();

            if (query.IsNullOrWhiteSpace())
            {
                return moviesResources;
            }

            // Try cache first
            if (_useCache)
            {
                var cleanTitle = query.CleanMovieTitle();
                var ids = _moviesService.AllMovieIds();
                moviesResources = GetMovieResources(ids).Where(m =>
                    (!string.IsNullOrEmpty(m.CleanTitle) && m.CleanTitle.Contains(cleanTitle, StringComparison.OrdinalIgnoreCase)) ||
                    m.ForeignId == query)
                .Take(100)
                .ToList();

                return moviesResources;
            }

            // cache not used, do normal search

            var availDelay = _configService.AvailabilityDelay;
            var movieStats = _movieStatisticsService.MovieStatistics();
            var sdict = movieStats.ToDictionary(x => x.MovieId);

            var movies = _moviesService.SearchMovies(query).Take(100).ToList();

            foreach (var movie in movies)
            {
                moviesResources.AddIfNotNull(movie.ToResource(availDelay, _qualityUpgradableSpecification));
            }

            LinkMovieStatistics(moviesResources, sdict);

            return moviesResources;
        }

        [HttpGet]
        public List<MovieResource> AllMovie(int? tmdbId, string tpdbId, string stashId, bool excludeLocalCovers = false)
        {
            var moviesResources = new List<MovieResource>();

            Dictionary<string, FileInfo> coverFileInfos = null;

            if (tmdbId.HasValue)
            {
                var movie = _moviesService.FindByTmdbId(tmdbId.Value);

                if (movie != null)
                {
                    moviesResources.AddIfNotNull(MapToResource(movie));
                }
            }
            else if (tpdbId.IsNotNullOrWhiteSpace())
            {
                var movie = _moviesService.FindByTpdbId(tpdbId);

                if (movie != null)
                {
                    moviesResources.AddIfNotNull(MapToResource(movie));
                }
            }
            else if (stashId.IsNotNullOrWhiteSpace())
            {
                var movie = _moviesService.FindByForeignId(stashId);

                if (movie != null)
                {
                    moviesResources.AddIfNotNull(MapToResource(movie));
                }
            }
            else
            {
                var movieStats = _movieStatisticsService.MovieStatistics();
                var availDelay = _configService.AvailabilityDelay;

                var movieTask = Task.Run(() => _moviesService.GetAllMovies());

                var sdict = movieStats.ToDictionary(x => x.MovieId);

                if (!excludeLocalCovers)
                {
                    coverFileInfos = _coverMapper.GetMovieCoverFileInfos();
                }

                var movies = movieTask.GetAwaiter().GetResult();
                moviesResources = new List<MovieResource>(movies.Count);

                foreach (var movie in movies)
                {
                    moviesResources.Add(movie.ToResource(availDelay, _qualityUpgradableSpecification));
                }

                if (!excludeLocalCovers)
                {
                    MapCoversToLocal(moviesResources, coverFileInfos);
                }

                LinkMovieStatistics(moviesResources, sdict);

                var rootFolders = _rootFolderService.All();

                moviesResources.ForEach(m => m.RootFolderPath = _rootFolderService.GetBestRootFolderPath(m.Path, rootFolders));
            }

            return moviesResources;
        }

        /// <summary>Retrieves a paged list of movies with advanced filtering options</summary>
        /// <param name="request">Paging and filtering parameters</param>
        /// <returns>Paged list of movies matching the specified criteria</returns>
        [HttpPost("paged")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public ActionResult<PagingResource<MovieResource>> GetMoviesPagedPost([FromBody] MoviePagingRequestResource request)
        {
            if (request == null)
            {
                _logger.Error("Paged movie request is null. Check the request body and route.");
                return BadRequest("Request body is null or invalid.");
            }

            var pagingResource = new PagingResource<MovieResource>(request);
            var pageSpec = pagingResource.MapToPagingSpec<MovieResource, Movie>(
                _allowedMovieSortKeys,
                "movieMetadata.sortTitle",
                SortDirection.Ascending);

            // Enforce itemType filter for movies
            pageSpec.FilterExpressions.Add(m => m.MovieMetadata.Value.ItemType == ItemType.Movie);

            var hasTagFilter = request.Filters != null && request.Filters.Any(f => f.Key?.ToLowerInvariant() == "tags" && f.Value != null);

            // Dapper doesn't support filtering on arrays like [1,2,3] so we do it in memory.
            if (hasTagFilter)
            {
                return GetPagedMoviesWithTags(request, pageSpec);
            }
            else
            {
                // Standard filtering without tags is optimized for performance
                return GetPagedMoviesStandard(request, pageSpec);
            }
        }

        /// <summary>Retrieves a paged list of scenes with advanced filtering options</summary>
        /// <param name="request">Paging and filtering parameters</param>
        /// <returns>Paged list of scenes matching the specified criteria</returns>
        [HttpPost("scenes/paged")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public ActionResult<PagingResource<MovieResource>> GetScenesPagedPost([FromBody] MoviePagingRequestResource request)
        {
            if (request == null)
            {
                _logger.Error("Paged scene request is null. Check the request body and route.");
                return BadRequest("Request body is null or invalid.");
            }

            var pagingResource = new PagingResource<MovieResource>(request);
            var pageSpec = pagingResource.MapToPagingSpec<MovieResource, Movie>(
                _allowedMovieSortKeys,
                "movieMetadata.sortTitle",
                SortDirection.Ascending);

            // Enforce itemType filter for scenes
            pageSpec.FilterExpressions.Add(m => m.MovieMetadata.Value.ItemType == ItemType.Scene);

            var hasTagFilter = request.Filters != null && request.Filters.Any(f => f.Key?.ToLowerInvariant() == "tags" && f.Value != null);

            // Dapper doesn't support filtering on arrays like [1,2,3] so we do it in memory.
            if (hasTagFilter)
            {
                return GetPagedMoviesWithTags(request, pageSpec);
            }
            else
            {
                // Standard filtering without tags is optimized for performance
                return GetPagedMoviesStandard(request, pageSpec);
            }
        }

        private ActionResult<PagingResource<MovieResource>> GetPagedMoviesWithTags(MoviePagingRequestResource request, PagingSpec<Movie> pageSpec)
        {
            var allMovies = _moviesService.GetAllMovies();
            ApplyMovieFiltersToPagingSpec(request.Filters, pageSpec);
            var filteredMovies = allMovies.AsQueryable();
            foreach (var expr in pageSpec.FilterExpressions)
            {
                filteredMovies = filteredMovies.Where(expr);
            }

            var sortKey = pageSpec.SortKey ?? "sortTitle";
            var pageSize = pageSpec.PageSize > 0 && pageSpec.PageSize < 1000 ? pageSpec.PageSize : 10;
            var sortDir = pageSpec.SortDirection;
            filteredMovies = sortDir == SortDirection.Descending
                ? filteredMovies.OrderByDescending(m => GetSortValue(m, sortKey))
                : filteredMovies.OrderBy(m => GetSortValue(m, sortKey));

            var offset = ((pageSpec.Page > 0 ? pageSpec.Page : 1) - 1) * pageSize;
            var totalCount = filteredMovies.Count();
            var page = filteredMovies
                .Skip(offset)
                .Take(pageSize)
                .ToList();

            var availDelay = _configService.AvailabilityDelay;
            var resources = page.Select(m => m.ToResource(availDelay, _qualityUpgradableSpecification)).ToList();

            var result = new PagingResource<MovieResource>(request)
            {
                Records = resources,
                TotalRecords = totalCount
            };
            return Ok(result);
        }

        private ActionResult<PagingResource<MovieResource>> GetPagedMoviesStandard(MoviePagingRequestResource request, PagingSpec<Movie> pageSpec)
        {
            ApplyMovieFiltersToPagingSpec(request.Filters, pageSpec);

            var availDelay = _configService.AvailabilityDelay;

            return pageSpec.ApplyToPage(_moviesService.Paged, resource =>
            {
                return resource.ToResource(availDelay, _qualityUpgradableSpecification);
            });
        }

        private object GetSortValue(Movie movie, string sortKey)
        {
            switch (sortKey.ToLowerInvariant())
            {
                case "sorttitle": return movie.MovieMetadata.Value.SortTitle;
                case "title": return movie.MovieMetadata.Value.Title;
                case "studio": return movie.MovieMetadata.Value.StudioTitle;
                case "releasedate": return movie.MovieMetadata.Value.ReleaseDateUtc;
                case "added": return movie.Added;
                case "sizeondisk": return movie.MovieFile?.Size ?? 0;
                case "qualityprofileid": return movie.QualityProfileId;
                case "runtime": return movie.MovieMetadata.Value.Runtime;
                case "year": return movie.MovieMetadata.Value.Year;
                case "monitored": return movie.Monitored;
                case "status": return movie.MovieMetadata.Value.Status;
                case "itemtype": return movie.MovieMetadata.Value.ItemType;
                default: return movie.MovieMetadata.Value.SortTitle;
            }
        }

        private void ApplyMovieFiltersToPagingSpec(List<MovieFilterResource> filters, PagingSpec<Movie> pageSpec)
        {
            if (filters == null || !filters.Any())
            {
                return;
            }

            foreach (var filter in filters)
            {
                if (filter == null)
                {
                    _logger.Warn("Null filter object encountered in Filters list.");
                    continue;
                }

                var key = filter.Key.ToLowerInvariant();
                var op = filter.Type?.ToLowerInvariant() ?? "equal";

                if (!(filter.Value is JsonElement jsonElement))
                {
                    continue;
                }

                switch (key)
                {
                    case "monitored":
                        ApplyBooleanFilter(pageSpec, jsonElement, op, m => m.Monitored);
                        break;
                    case "itemtype":
                        ApplyItemTypeFilter(pageSpec, jsonElement, op);
                        break;
                    case "status":
                        ApplyEnumFilter<MovieStatusType>(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.Status);
                        break;
                    case "qualityprofileid":
                        var qualityProfileIds = ParseIntArray(jsonElement);
                        if (qualityProfileIds.Count > 0)
                        {
                            switch (op)
                            {
                                case "equal":
                                    pageSpec.FilterExpressions.Add(m => qualityProfileIds.Contains(m.QualityProfileId));
                                    break;
                                case "notequal":
                                    pageSpec.FilterExpressions.Add(m => !qualityProfileIds.Contains(m.QualityProfileId));
                                    break;
                            }
                        }

                        break;
                    case "releasedate":
                        ApplyStringFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.ReleaseDate);
                        break;
                    case "title":
                        ApplyStringFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.Title);
                        break;
                    case "studio":
                        ApplyStringFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.StudioTitle);
                        break;
                    case "year":
                        ApplyNumericFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.Year);
                        break;
                    case "runtime":
                        ApplyNumericFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.Runtime);
                        break;
                }
            }
        }

        private void ApplyItemTypeFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation)
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var itemTypeStr = element.GetString();
                if (Enum.TryParse<ItemType>(itemTypeStr, ignoreCase: true, out var itemType))
                {
                    switch (operation)
                    {
                        case "equal":
                            pageSpec.FilterExpressions.Add(m => m.MovieMetadata.Value.ItemType == itemType);
                            break;
                        case "notequal":
                            pageSpec.FilterExpressions.Add(m => m.MovieMetadata.Value.ItemType != itemType);
                            break;
                    }
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                var itemTypes = new List<ItemType>();
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String && Enum.TryParse<ItemType>(item.GetString(), ignoreCase: true, out var itemType))
                    {
                        itemTypes.Add(itemType);
                    }
                }

                if (itemTypes.Count > 0)
                {
                    switch (operation)
                    {
                        case "equal":
                            pageSpec.FilterExpressions.Add(m => itemTypes.Contains(m.MovieMetadata.Value.ItemType));
                            break;
                        case "notequal":
                            pageSpec.FilterExpressions.Add(m => !itemTypes.Contains(m.MovieMetadata.Value.ItemType));
                            break;
                    }
                }
            }
        }

        private List<int> ParseIntArray(JsonElement element)
        {
            var list = new List<int>();
            if (element.ValueKind != JsonValueKind.Array)
            {
                return list;
            }

            foreach (var item in element.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var intValue))
                {
                    list.Add(intValue);
                }
                else if (item.ValueKind == JsonValueKind.String && int.TryParse(item.GetString(), out var strIntValue))
                {
                    list.Add(strIntValue);
                }
            }

            return list;
        }

        private void ApplyBooleanFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, bool>> propertySelector)
        {
            if (element.ValueKind == JsonValueKind.True || element.ValueKind == JsonValueKind.False)
            {
                var value = element.GetBoolean();
                var param = propertySelector.Parameters[0];
                var property = propertySelector.Body;

                switch (operation)
                {
                    case "equal":
                        var equalExpr = Expression.Lambda<Func<Movie, bool>>(
                            Expression.Equal(property, Expression.Constant(value)),
                            param);
                        pageSpec.FilterExpressions.Add(equalExpr);
                        break;
                    case "notequal":
                        var notEqualExpr = Expression.Lambda<Func<Movie, bool>>(
                            Expression.NotEqual(property, Expression.Constant(value)),
                            param);
                        pageSpec.FilterExpressions.Add(notEqualExpr);
                        break;
                }
            }
        }

        private void ApplyStringFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, string>> propertySelector)
        {
            var values = new List<string>();
            if (element.ValueKind == JsonValueKind.String)
            {
                values.Add(element.GetString());
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        values.Add(item.GetString());
                    }
                }
            }

            if (values.Count == 0)
            {
                return;
            }

            var param = propertySelector.Parameters[0];
            var property = propertySelector.Body;

            switch (operation)
            {
                case "equal":
                    var equalExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.Call(
                            typeof(Enumerable),
                            "Contains",
                            new[] { typeof(string) },
                            Expression.Constant(values),
                            property),
                        param);
                    pageSpec.FilterExpressions.Add(equalExpr);
                    break;
                case "contains":
                    foreach (var value in values)
                    {
                        var containsExpr = Expression.Lambda<Func<Movie, bool>>(
                            Expression.Call(property, typeof(string).GetMethod("Contains", new[] { typeof(string) }), Expression.Constant(value)),
                            param);
                        pageSpec.FilterExpressions.Add(containsExpr);
                    }

                    break;
                case "notequal":
                    var notEqualCall = Expression.Call(
                        typeof(Enumerable),
                        "Contains",
                        new[] { typeof(string) },
                        Expression.Constant(values),
                        property);
                    var notEqualExpr = Expression.Lambda<Func<Movie, bool>>(Expression.Not(notEqualCall), param);
                    pageSpec.FilterExpressions.Add(notEqualExpr);
                    break;
            }
        }

        private void ApplyNumericFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, int>> propertySelector)
        {
            var values = ParseIntArray(element);
            if (values.Count == 0)
            {
                return;
            }

            var param = propertySelector.Parameters[0];
            var property = propertySelector.Body;

            switch (operation)
            {
                case "equal":
                    var equalExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.Call(
                            typeof(Enumerable),
                            "Contains",
                            new[] { typeof(int) },
                            Expression.Constant(values),
                            property),
                        param);
                    pageSpec.FilterExpressions.Add(equalExpr);
                    break;
                case "notequal":
                    var notEqualCall = Expression.Call(
                        typeof(Enumerable),
                        "Contains",
                        new[] { typeof(int) },
                        Expression.Constant(values),
                        property);
                    var notEqualExpr = Expression.Lambda<Func<Movie, bool>>(Expression.Not(notEqualCall), param);
                    pageSpec.FilterExpressions.Add(notEqualExpr);
                    break;
                case "greaterthan":
                    var gtValue = values.First();
                    var gtExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.GreaterThan(property, Expression.Constant(gtValue)),
                        param);
                    pageSpec.FilterExpressions.Add(gtExpr);
                    break;
                case "lessthan":
                    var ltValue = values.First();
                    var ltExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.LessThan(property, Expression.Constant(ltValue)),
                        param);
                    pageSpec.FilterExpressions.Add(ltExpr);
                    break;
                case "greaterthanorequal":
                    var gteValue = values.First();
                    var gteExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.GreaterThanOrEqual(property, Expression.Constant(gteValue)),
                        param);
                    pageSpec.FilterExpressions.Add(gteExpr);
                    break;
                case "lessthanorequal":
                    var lteValue = values.First();
                    var lteExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.LessThanOrEqual(property, Expression.Constant(lteValue)),
                        param);
                    pageSpec.FilterExpressions.Add(lteExpr);
                    break;
            }
        }

        private void ApplyEnumFilter<TEnum>(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, TEnum>> propertySelector)
            where TEnum : Enum
        {
            var values = new List<TEnum>();

            if (element.ValueKind == JsonValueKind.String)
            {
                try
                {
                    var enumValue = (TEnum)Enum.Parse(typeof(TEnum), element.GetString(), ignoreCase: true);
                    values.Add(enumValue);
                }
                catch
                {
                    // Ignore invalid enum values
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        try
                        {
                            var enumValue = (TEnum)Enum.Parse(typeof(TEnum), item.GetString(), ignoreCase: true);
                            values.Add(enumValue);
                        }
                        catch
                        {
                            // Ignore invalid enum values
                        }
                    }
                    else if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var intValue))
                    {
                        if (Enum.IsDefined(typeof(TEnum), intValue))
                        {
                            values.Add((TEnum)Enum.ToObject(typeof(TEnum), intValue));
                        }
                    }
                }
            }

            if (values.Count == 0)
            {
                return;
            }

            var param = propertySelector.Parameters[0];
            var property = propertySelector.Body;

            switch (operation)
            {
                case "equal":
                    var equalExpr = Expression.Lambda<Func<Movie, bool>>(
                        Expression.Call(
                            typeof(Enumerable),
                            "Contains",
                            new[] { typeof(TEnum) },
                            Expression.Constant(values),
                            property),
                        param);
                    pageSpec.FilterExpressions.Add(equalExpr);
                    break;
                case "notequal":
                    var notEqualCall = Expression.Call(
                        typeof(Enumerable),
                        "Contains",
                        new[] { typeof(TEnum) },
                        Expression.Constant(values),
                        property);
                    var notEqualExpr = Expression.Lambda<Func<Movie, bool>>(Expression.Not(notEqualCall), param);
                    pageSpec.FilterExpressions.Add(notEqualExpr);
                    break;
            }
        }

        protected override MovieResource GetResourceById(int id)
        {
            if (_useCache)
            {
                return GetMovieResource(id);
            }

            var movie = _moviesService.GetMovie(id);

            return MapToResource(movie);
        }

        [HttpGet("list")]
        public List<int> ListMovies()
        {
            var moviesResources = new List<MovieResource>();

            var movieTask = Task.Run(() => _moviesService.AllMovieIds());

            return movieTask.GetAwaiter().GetResult();
        }

        // Added to support bulk monitor from Studio and eventually Performer detail page groupings
        [HttpPatch("bulk/monitor")]
        public IActionResult SetMoviesMonitored([FromBody] List<int> ids, [FromQuery] bool? monitored)
        {
            if (monitored == null)
            {
                return BadRequest("You must specify ?monitored=true or ?monitored=false.");
            }

            if (ids == null || !ids.Any())
            {
                return BadRequest("No IDs provided.");
            }

            var toUpdate = _moviesService.GetMovies(ids);

            if (toUpdate == null || !toUpdate.Any())
            {
                return NotFound("No movies found for given IDs.");
            }

            foreach (var movie in toUpdate)
            {
                movie.Monitored = monitored.Value;
            }

            var updated = _moviesService.UpdateMovieMonitored(toUpdate, (bool)monitored);
            foreach (var movie in updated)
            {
                _movieResourcesCache.Remove(movie.Id.ToString());
            }

            BroadcastResourceChangeBatch(ModelAction.Updated, updated.Select(MapToResource));

            return Ok();
        }

        [HttpPost("bulk")]
        public List<MovieResource> GetResourceByIds([FromBody] List<int> ids)
        {
            if (_useCache)
            {
                return GetMovieResources(ids);
            }

            var moviesResources = new List<MovieResource>();

            var movieStats = _movieStatisticsService.MovieStatistics(ids);
            var coverFileInfos = _coverMapper.GetMovieCoverFileInfos();
            var sdict = movieStats.ToDictionary(x => x.MovieId);
            var availDelay = _configService.AvailabilityDelay;
            var movies = _moviesService.FindByIds(ids);

            foreach (var movie in movies)
            {
                moviesResources.Add(movie.ToResource(availDelay, _qualityUpgradableSpecification));
            }

            LinkMovieStatistics(moviesResources, sdict);
            MapCoversToLocal(moviesResources, coverFileInfos);

            var rootFolders = _rootFolderService.All();

            moviesResources.ForEach(m => m.RootFolderPath = _rootFolderService.GetBestRootFolderPath(m.Path, rootFolders));

            return moviesResources;
        }

        [HttpGet("listByPerformerForeignId")]
        public List<int> ListByPerformerForeignId(string performerForeignId)
        {
            var moviesList = new List<int>();
            if (_useCache)
            {
                var moviesResources = GetMovieResources();
                moviesList = moviesResources.Where(m => m.PerformerForeignIds.Where(x => x == performerForeignId).Any()).Map(x => x.Id).ToList();
            }
            else
            {
                moviesList = _moviesService.GetByPerformerForeignId(performerForeignId).Map(x => x.Id).ToList();
            }

            return moviesList;
        }

        [HttpGet("listByStudioForeignId")]
        public List<int> ListByStudioForeignId(string studioForeignId)
        {
            return _moviesService.GetByStudioForeignId(studioForeignId).Map(x => x.Id).ToList();
        }

        protected MovieResource MapToResource(Movie movie)
        {
            if (movie == null)
            {
                return null;
            }

            var availDelay = _configService.AvailabilityDelay;

            var resource = movie.ToResource(availDelay, _qualityUpgradableSpecification);

            // TODO: movie this to the movie updated event handler instead
            MapCoversToLocal(resource);
            FetchAndLinkMovieStatistics(resource);

            resource.RootFolderPath = _rootFolderService.GetBestRootFolderPath(resource.Path);

            if (_useCache)
            {
                _movieResourcesCache.Set(resource.Id.ToString(), resource);
            }

            return resource;
        }

        [RestPostById]
        [Consumes("application/json")]
        [Produces("application/json")]
        public ActionResult<MovieResource> AddMovie([FromBody] MovieResource moviesResource)
        {
            var movie = _addMovieService.AddMovie(moviesResource.ToModel());

            return Created(movie.Id);
        }

        [RestPutById]
        [Consumes("application/json")]
        [Produces("application/json")]
        public ActionResult<MovieResource> UpdateMovie([FromBody] MovieResource moviesResource, [FromQuery] bool moveFiles = false)
        {
            var movie = _moviesService.GetMovie(moviesResource.Id);

            if (moveFiles)
            {
                var sourcePath = movie.Path;
                var destinationPath = moviesResource.Path;

                _commandQueueManager.Push(new MoveMovieCommand
                {
                    MovieId = movie.Id,
                    SourcePath = sourcePath,
                    DestinationPath = destinationPath
                }, trigger: CommandTrigger.Manual);
            }

            var model = moviesResource.ToModel(movie);

            var updatedMovie = _moviesService.UpdateMovie(model);

            return Accepted(moviesResource.Id);
        }

        [RestDeleteById]
        public void DeleteMovie(int id, bool deleteFiles = false, bool addImportExclusion = false)
        {
            _moviesService.DeleteMovie(id, deleteFiles, addImportExclusion);
        }

        private void MapCoversToLocal(MovieResource movie)
        {
            if (movie == null || !movie.Images.Any())
            {
                return;
            }

            try
            {
                _coverMapper.ConvertToLocalUrls(movie.Id, movie.Images);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error mapping covers to local for movie {MovieId}", movie.Id);
            }
        }

        private void MapCoversToLocal(IEnumerable<MovieResource> movies, Dictionary<string, FileInfo> coverFileInfos)
        {
            // Workaround for bulk API failing here and crashing app web loading
            // Will be addressed in future via pagination API re-work
            // If failures happen, worst case is covers are hotlinked from StashDB
            try
            {
                _coverMapper.ConvertToLocalUrls(movies.Select(x => Tuple.Create(x.Id, x.Images.AsEnumerable())), coverFileInfos);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error mapping covers to local for movies");
            }
        }

        private void FetchAndLinkMovieStatistics(MovieResource resource)
        {
            LinkMovieStatistics(resource, _movieStatisticsService.MovieStatistics(resource.Id));
        }

        private void LinkMovieStatistics(List<MovieResource> resources, Dictionary<int, MovieStatistics> sDict)
        {
            if (resources == null || sDict == null)
            {
                return;
            }

            foreach (var movie in resources)
            {
                if (movie == null)
                {
                    continue;
                }

                if (sDict.TryGetValue(movie.Id, out var stats) && stats != null)
                {
                    LinkMovieStatistics(movie, stats);
                }
            }
        }

        private void LinkMovieStatistics(MovieResource resource, MovieStatistics movieStatistics)
        {
            if (resource == null || movieStatistics == null)
            {
                return;
            }

            resource.Statistics = movieStatistics.ToResource();
            resource.HasFile = movieStatistics.MovieFileCount > 0;
            resource.SizeOnDisk = movieStatistics.SizeOnDisk;
        }

        [NonAction]
        public void Handle(MovieFileImportedEvent message)
        {
            _movieResourcesCache.Remove(message.MovieInfo.Movie.Id.ToString());

            var updatedMovie = _moviesService.GetMovie(message.MovieInfo.Movie.Id);
            if (updatedMovie != null)
            {
                BroadcastResourceChange(ModelAction.Updated, MapToResource(updatedMovie));
            }
            else
            {
                BroadcastResourceChange(ModelAction.Updated, message.MovieInfo.Movie.Id);
            }
        }

        [NonAction]
        public void Handle(MovieFileDeletedEvent message)
        {
            if (message.Reason == DeleteMediaFileReason.Upgrade
                || message.MovieFile.MovieId == 0)
            {
                return;
            }

            _movieResourcesCache.Remove(message.MovieFile.MovieId.ToString());
            var updatedMovie = _moviesService.GetMovie(message.MovieFile.MovieId);
            if (updatedMovie != null)
            {
                BroadcastResourceChange(ModelAction.Updated, MapToResource(updatedMovie));
            }
            else
            {
                BroadcastResourceChange(ModelAction.Updated, message.MovieFile.MovieId);
            }
        }

        [NonAction]
        public void Handle(MovieUpdatedEvent message)
        {
            _movieResourcesCache.Remove(message.Movie.Id.ToString());
            BroadcastResourceChange(ModelAction.Updated, MapToResource(message.Movie));
        }

        [NonAction]
        public void Handle(MovieEditedEvent message)
        {
            _movieResourcesCache.Remove(message.Movie.Id.ToString());
            BroadcastResourceChange(ModelAction.Updated, MapToResource(message.Movie));
        }

        [NonAction]
        public void Handle(MoviesDeletedEvent message)
        {
            if (message?.Movies == null || !message.Movies.Any())
            {
                return;
            }

            foreach (var movie in message.Movies)
            {
                _movieResourcesCache.Remove(movie.Id.ToString());
            }

            BroadcastResourceChangeBatch(ModelAction.Deleted, message.Movies.Select(m => new MovieResource { Id = m.Id }));
        }

        [NonAction]
        public void Handle(MoviesBulkEditedEvent message)
        {
            if (message?.Movies == null || !message.Movies.Any())
            {
                return;
            }

            foreach (var movie in message.Movies)
            {
                _movieResourcesCache.Remove(movie.Id.ToString());
            }

            // Batch broadcast with mapped resources
            BroadcastResourceChangeBatch(ModelAction.Updated, message.Movies.Select(MapToResource));
        }

        [NonAction]
        public void Handle(MovieRenamedEvent message)
        {
            _movieResourcesCache.Remove(message.Movie.Id.ToString());
            BroadcastResourceChange(ModelAction.Updated, MapToResource(message.Movie));
        }

        [NonAction]
        public void Handle(MediaCoversUpdatedEvent message)
        {
            if (message.Updated)
            {
                _movieResourcesCache.Remove(message.Movie.Id.ToString());
                var updatedMovie = _moviesService.GetMovie(message.Movie.Id);
                BroadcastResourceChange(ModelAction.Updated, MapToResource(updatedMovie));
            }
        }

        private MovieResource GetMovieResource(int id)
        {
            return _movieResourcesCache.Get(id.ToString(), () =>
            {
                var ids = new List<int>() { id };

                var moviesResources = new List<MovieResource>();
                var movieStats = _movieStatisticsService.MovieStatistics(ids);

                var coverFileInfos = _coverMapper.GetMovieCoverFileInfos();
                var sdict = movieStats.ToDictionary(x => x.MovieId);
                var availDelay = _configService.AvailabilityDelay;
                var movies = _moviesService.FindByIds(ids);

                foreach (var movie in movies)
                {
                    try
                    {
                        moviesResources.Add(movie.ToResource(availDelay, _qualityUpgradableSpecification));
                    }
                    catch (Exception e)
                    {
                        _logger.Error(e, "Error Converting  '{0}' to Resource", movie);
                    }
                }

                LinkMovieStatistics(moviesResources, sdict);
                MapCoversToLocal(moviesResources.FirstOrDefault());

                return moviesResources.FirstOrDefault();
            });
        }

        private List<MovieResource> GetMovieResources()
        {
            var ids = ListMovies();
            return GetMovieResources(ids);
        }

        private List<MovieResource> GetMovieResources(List<int> ids)
        {
            var moviesResources = new List<MovieResource>();

            var stopwatch = new Stopwatch();
            stopwatch.Start();
            _logger.Trace($"GetMovieResources {ids.Count} movies");

            var missingIds = new List<int>();
            foreach (var id in ids)
            {
                var movieResource = _movieResourcesCache.Find(id.ToString());
                if (movieResource == null)
                {
                    missingIds.Add(id);
                }
                else
                {
                    moviesResources.AddIfNotNull(movieResource);
                }
            }

            if (missingIds.Count > 0)
            {
                var releaseLock = false;
                var getIds = new List<int>();

                try
                {
                    _logger.Info($"Caching {missingIds.Count} movies with {_movieResourcesCache.Lock.CurrentCount} available threads.");

                    // If there are a large number of missing IDs, acquire the lock to prevent cache stampede
                    if (missingIds.Count > 100)
                    {
                        _movieResourcesCache.Lock.Wait();
                        releaseLock = true;
                        if (stopwatch.Elapsed.TotalSeconds > 2)
                        {
                            _logger.Warn($"Locked movie cache for {stopwatch.Elapsed.TotalSeconds} seconds");
                        }

                        // recheck after acquiring the lock
                        foreach (var id in missingIds)
                        {
                            var movieResource = _movieResourcesCache.Find(id.ToString());
                            if (movieResource == null)
                            {
                                getIds.Add(id);
                            }
                            else
                            {
                                moviesResources.AddIfNotNull(movieResource);
                            }
                        }
                    }
                    else
                    {
                        getIds = missingIds;
                    }

                    if (getIds.Count > 0)
                    {
                        var coverFileInfos = _coverMapper.GetMovieCoverFileInfos();
                        var availDelay = _configService.AvailabilityDelay;

                        var movies = _moviesService.FindByIds(getIds);
                        var movieStats = _movieStatisticsService.MovieStatistics(getIds);
                        var sdict = movieStats.ToDictionary(x => x.MovieId);

                        foreach (var movie in movies)
                        {
                            try
                            {
                                moviesResources.Add(movie.ToResource(availDelay, _qualityUpgradableSpecification));
                            }
                            catch (Exception e)
                            {
                                _logger.Error(e, "Error Converting  '{0}' to Resource", movie);
                            }
                        }

                        LinkMovieStatistics(moviesResources, sdict);
                        MapCoversToLocal(moviesResources, coverFileInfos);

                        var rootFolders = _rootFolderService.All();

                        moviesResources.ForEach(m => m.RootFolderPath = _rootFolderService.GetBestRootFolderPath(m.Path, rootFolders));

                        if (_useCache)
                        {
                            foreach (var moviesResource in moviesResources)
                            {
                                _movieResourcesCache.Set(moviesResource.Id.ToString(), moviesResource);
                            }
                        }
                    }
                }
                finally
                {
                    stopwatch.Stop();
                    if (releaseLock)
                    {
                        _movieResourcesCache.Lock.Release();
                    }
                }
            }

            if (stopwatch.Elapsed.TotalSeconds > 60)
            {
                _logger.Warn($"Processed movie cache for {ids.Count} after {stopwatch.Elapsed.TotalSeconds} seconds");
            }

            return moviesResources;
        }
    }
}
