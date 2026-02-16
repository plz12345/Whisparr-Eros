using System.Collections.Generic;

namespace Whisparr.Http
{
    // Represents a single filter condition for movies/scenes
    public class MovieFilterResource
    {
        public string Key { get; set; } // e.g., "monitored", "status", "releaseDate", "itemType"
        public string Type { get; set; } // e.g., "equal", "contains", "greaterThan"
        public object Value { get; set; } // Value to filter by
    }

    // Paging request resource for movies/scenes, including filters
    public class MoviePagingRequestResource : PagingRequestResource
    {
        public List<MovieFilterResource> Filters { get; set; } = new();
    }
}
