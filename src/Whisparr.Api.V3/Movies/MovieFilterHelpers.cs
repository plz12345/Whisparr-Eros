using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using NLog;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Movies;

public static class MovieFilterHelpers
{
    private static readonly Logger _logger = LogManager.GetCurrentClassLogger();

    public static void ApplyMovieFiltersToPagingSpec(List<Whisparr.Http.MovieFilterResource> filters, PagingSpec<Movie> pageSpec)
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
                    ApplyDateFilter(pageSpec, jsonElement, op, m => m.MovieMetadata.Value.ReleaseDateUtc);
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

    public static void ApplyItemTypeFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation)
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

    public static void ApplyDateFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, DateTime?>> propertySelector)
    {
        var values = new List<DateTime>();
        if (element.ValueKind == JsonValueKind.String)
        {
            if (DateTime.TryParse(element.GetString(), out var dt))
            {
                values.Add(dt);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String && DateTime.TryParse(item.GetString(), out var dt))
                {
                    values.Add(dt);
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
                        new[] { typeof(DateTime) },
                        Expression.Constant(values),
                        Expression.Convert(property, typeof(DateTime))),
                    param);
                pageSpec.FilterExpressions.Add(equalExpr);
                break;
            case "notequal":
                var notEqualCall = Expression.Call(
                    typeof(Enumerable),
                    "Contains",
                    new[] { typeof(DateTime) },
                    Expression.Constant(values),
                    Expression.Convert(property, typeof(DateTime)));
                var notEqualExpr = Expression.Lambda<Func<Movie, bool>>(Expression.Not(notEqualCall), param);
                pageSpec.FilterExpressions.Add(notEqualExpr);
                break;
            case "greaterthan":
                var gtValue = values.First();
                var gtExpr = Expression.Lambda<Func<Movie, bool>>(
                    Expression.GreaterThan(property, Expression.Constant(gtValue, typeof(DateTime?))),
                    param);
                pageSpec.FilterExpressions.Add(gtExpr);
                break;
            case "lessthan":
                var ltValue = values.First();
                var ltExpr = Expression.Lambda<Func<Movie, bool>>(
                    Expression.LessThan(property, Expression.Constant(ltValue, typeof(DateTime?))),
                    param);
                pageSpec.FilterExpressions.Add(ltExpr);
                break;
            case "greaterthanorequal":
                var gteValue = values.First();
                var gteExpr = Expression.Lambda<Func<Movie, bool>>(
                    Expression.GreaterThanOrEqual(property, Expression.Constant(gteValue, typeof(DateTime?))),
                    param);
                pageSpec.FilterExpressions.Add(gteExpr);
                break;
            case "lessthanorequal":
                var lteValue = values.First();
                var lteExpr = Expression.Lambda<Func<Movie, bool>>(
                    Expression.LessThanOrEqual(property, Expression.Constant(lteValue, typeof(DateTime?))),
                    param);
                pageSpec.FilterExpressions.Add(lteExpr);
                break;
        }
    }

    public static List<int> ParseIntArray(JsonElement element)
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

    public static void ApplyBooleanFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, bool>> propertySelector)
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

    public static void ApplyStringFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, string>> propertySelector)
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

    public static void ApplyNumericFilter(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, int>> propertySelector)
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

    public static void ApplyEnumFilter<TEnum>(PagingSpec<Movie> pageSpec, JsonElement element, string operation, Expression<Func<Movie, TEnum>> propertySelector)
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
}
