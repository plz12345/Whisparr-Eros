import { useSelector } from 'react-redux';
import AppState, { Filter, PropertyFilter } from 'App/State/AppState';
import { CustomFilter } from 'Filters/Filter';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { SortDirection } from 'Helpers/Props/sortDirections';
import Movie from 'Movie/Movie';
import { filters as movieFilters } from 'Store/Actions/movieActions';
import { createCustomFiltersSelector } from 'Store/Selectors/createClientSideCollectionSelector';

/**
 * Maps frontend sort keys to backend table-prefixed format.
 * Properties on MovieMetadata table need the "movieMetadata." prefix.
 * Properties on Movies table need the "movies." prefix.
 */
const sortKeyMapping: Record<string, string> = {
  sortTitle: 'movieMetadata.sortTitle',
  title: 'movieMetadata.title',
  studioTitle: 'movieMetadata.studioTitle',
  releaseDate: 'movieMetadata.releaseDate',
  year: 'movieMetadata.year',
  runtime: 'movieMetadata.runtime',
  status: 'movieMetadata.status',
  itemType: 'movieMetadata.itemType',
  added: 'movies.added',
  monitored: 'movies.monitored',
  path: 'movies.path',
  qualityProfileId: 'movies.qualityProfileId',
  sizeOnDisk: 'movieMetadata.sizeOnDisk',
};

function mapSortKey(sortKey: string): string {
  return sortKeyMapping[sortKey] || sortKeyMapping.sortTitle;
}

/**
 * Filter configuration for movie queries
 */
export interface MovieFilter {
  key: string;
  operator: string;
  value: string | number | boolean;
}

/**
 * Parameters for querying paginated movie data
 */
export interface MovieIndexQueryParams {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: SortDirection;
  filters: PropertyFilter[];
}

/**
 * Response from the paginated movie index API endpoint
 */
export interface MovieIndexPagedResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: SortDirection;
  totalRecords: number;
  records: Movie[];
  filters: PropertyFilter[];
  customFilters: PropertyFilter[];
}

/**
 * Custom hook for fetching paginated movie data from the API.
 *
 * Handles filter resolution by checking if the selected filter is a custom filter
 * (numeric ID) or a predefined filter (string key), then merges the appropriate
 * filter configuration into the query parameters.
 *
 * @param params - Query parameters (page, pageSize, sort, etc.)
 * @param options - React Query options (e.g., placeholderData)
 * @returns Query result with movie data and loading state
 */
export function useMovieIndexQuery(
  params: MovieIndexQueryParams,
  options: {
    placeholderData: (prev: MovieIndexPagedResponse) => MovieIndexPagedResponse;
  }
) {
  // Retrieve selected filter key from Redux store
  const selectedFilterKey = useSelector(
    (state: AppState) => state.movieIndex.selectedFilterKey
  );

  // Get custom filters from Redux store
  const customFilters = useSelector(createCustomFiltersSelector('movieIndex'));

  let filterDef: Filter | undefined = undefined;
  let filters: PropertyFilter[] = [];

  // Resolve filter definition: custom filters (numeric IDs) or predefined filters (string keys)
  if (
    selectedFilterKey !== undefined &&
    selectedFilterKey !== null &&
    !isNaN(Number(selectedFilterKey))
  ) {
    // Numeric ID indicates a custom filter
    filterDef = customFilters.find(
      (f: CustomFilter) => String(f.id) === String(selectedFilterKey)
    );
    filters = filterDef && filterDef.filters ? filterDef.filters : [];
  } else {
    // String key indicates a predefined filter
    filterDef = movieFilters.find((f: Filter) => f.key === selectedFilterKey);
    filters = filterDef && filterDef.filters ? filterDef.filters : [];
  }

  // Combine query parameters with resolved filters and map the sort key
  const queryParams = {
    ...params,
    sortKey: mapSortKey(params.sortKey),
    filters,
  };

  // Execute API query for paginated movie data
  return useApiQuery<MovieIndexPagedResponse>({
    path: '/movie/paged',
    method: 'POST',
    body: queryParams,
    ...options,
  });
}
