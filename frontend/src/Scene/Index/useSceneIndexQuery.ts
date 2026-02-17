import { useSelector } from 'react-redux';
import AppState, { Filter, PropertyFilter } from 'App/State/AppState';
import { CustomFilter } from 'Filters/Filter';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { SortDirection } from 'Helpers/Props/sortDirections';
import { filters as sceneFilters } from 'Store/Actions/sceneIndexActions';
import { createCustomFiltersSelector } from 'Store/Selectors/createClientSideCollectionSelector';

/**
 * Maps frontend sort keys to backend table-prefixed format for scenes.
 * Adjust as needed for Scene/movieMetadata tables.
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

export type SceneFilter = {
  key: string;
  operator: string;
  value: string | number | boolean;
};

export type SceneIndexQueryParams = {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: SortDirection;
  filters: PropertyFilter[];
};

export type SceneIndexPagedResponse = {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: SortDirection;
  totalRecords: number;
  records: unknown[];
  filters: PropertyFilter[];
  customFilters: PropertyFilter[];
};
export function useSceneIndexQuery(
  params: SceneIndexQueryParams,
  options: {
    placeholderData: (prev: SceneIndexPagedResponse) => SceneIndexPagedResponse;
  }
) {
  // Retrieve selected filter key from Redux store
  const selectedFilterKey = useSelector(
    (state: AppState) => state.sceneIndex.selectedFilterKey
  );

  // Get custom filters from Redux store
  const customFilters = useSelector(createCustomFiltersSelector('sceneIndex'));

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
    filterDef = sceneFilters.find((f: Filter) => f.key === selectedFilterKey);
    filters = filterDef && filterDef.filters ? filterDef.filters : [];
  }

  // Combine query parameters with resolved filters and map the sort key
  const queryParams = {
    ...params,
    sortKey: mapSortKey(params.sortKey),
    filters,
  };

  // Execute API query for paginated scene data
  return useApiQuery<SceneIndexPagedResponse>({
    path: '/movie/paged?itemType=scene',
    method: 'POST',
    body: queryParams,
    ...options,
  });
}
