import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import {
  setSceneFilter,
  setScenePage,
  setSceneSort,
  setSceneTableOption,
  setSceneView,
} from 'Store/Actions/sceneIndexActions';
import { createCustomFiltersSelector } from 'Store/Selectors/createClientSideCollectionSelector';
import { useSceneIndexQuery } from './useSceneIndexQuery';

export function useSceneIndex() {
  // Paging and sorting state from Redux store
  const customFilters = useSelector(createCustomFiltersSelector('sceneIndex'));
  const columns = useSelector((state: AppState) => state.sceneIndex.columns);
  const selectedFilterKey = useSelector(
    (state: AppState) => state.sceneIndex.selectedFilterKey
  );
  const sortKey = useSelector((state: AppState) => state.sceneIndex.sortKey);
  const sortDirection = useSelector(
    (state: AppState) => state.sceneIndex.sortDirection
  );
  const page = useSelector((state: AppState) => state.sceneIndex.page);
  const view = useSelector((state: AppState) => state.sceneIndex.view);
  const filters = useSelector((state: AppState) => state.sceneIndex.filters);

  const dispatch = useDispatch();

  // Read pageSize from the appropriate options based on view
  const pageSize = useSelector((state: AppState) => {
    if (view === 'overview') {
      return state.sceneIndex.overviewOptions?.pageSize ?? 25;
    }
    if (view === 'posters') {
      return state.sceneIndex.posterOptions?.pageSize ?? 25;
    }
    return state.sceneIndex.tableOptions?.pageSize ?? 25;
  });

  // Build query parameters for data fetching
  const queryParams = {
    page,
    pageSize,
    sortKey,
    sortDirection,
    filters: [], // API uses selectedFilterKey instead
  };

  // Fetch scene data with React Query, keeping previous data during refetch
  const { data, isPending } = useSceneIndexQuery(queryParams, {
    placeholderData: (prev) => prev,
  });

  // UI state
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [jumpToCharacter, setJumpToCharacter] = useState<string | undefined>(
    undefined
  );
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Pagination state (no handlers, as setScenePage does not exist)
  const totalRecords = data?.totalRecords || 0;
  const totalPages = data ? Math.ceil(data.totalRecords / pageSize) : 1;

  // Modal handlers
  const onOptionsPress = useCallback(() => {
    setIsOptionsModalOpen(true);
  }, [setIsOptionsModalOpen]);
  const onOptionsModalClose = useCallback(() => {
    setIsOptionsModalOpen(false);
  }, [setIsOptionsModalOpen]);

  // Table option handler
  const onTableOptionChange = useCallback(
    (payload: unknown) => {
      dispatch(setSceneTableOption(payload));
    },
    [dispatch]
  );

  // Filter handler
  const onFilterSelect = useCallback(
    (value: string | number) => {
      dispatch(setSceneFilter({ selectedFilterKey: value }));
      dispatch(setScenePage(1));
    },
    [dispatch]
  );

  // Sort handler
  const handleSortPress = useCallback(
    (value: string) => {
      dispatch(setSceneSort({ sortKey: value }));
      dispatch(setScenePage(1));
    },
    [dispatch]
  );

  // View handler
  const onViewSelect = useCallback(
    (value: string) => {
      dispatch(setSceneView({ view: value }));
      if (scrollerRef.current) {
        scrollerRef.current.scrollTo(0, 0);
      }
    },
    [scrollerRef, dispatch]
  );

  // Pagination handlers (matching MovieIndex)
  const handleFirstPagePress = useCallback(() => {
    dispatch(setScenePage(1));
  }, [dispatch]);
  const handlePreviousPagePress = useCallback(() => {
    dispatch(setScenePage(Math.max(1, page - 1)));
  }, [dispatch, page]);
  const handleNextPagePress = useCallback(() => {
    dispatch(setScenePage(Math.min(totalPages, page + 1)));
  }, [dispatch, page, totalPages]);
  const handleLastPagePress = useCallback(() => {
    dispatch(setScenePage(totalPages));
  }, [dispatch, totalPages]);
  const handlePageSelect = useCallback(
    (newPage: number) => {
      dispatch(setScenePage(newPage));
    },
    [dispatch]
  );

  // Memoize items to ensure SelectProvider receives consistent references
  const memoizedItems = useMemo(
    () => (data?.records ?? []) as unknown[],
    [data?.records]
  );

  return {
    items: memoizedItems,
    totalItems: totalRecords,
    page,
    pageSize,
    totalPages,
    sortKey,
    sortDirection,
    columns,
    customFilters,
    filters,
    isFetching: isPending,
    isOptionsModalOpen,
    isSelectMode,
    jumpToCharacter,
    scrollerRef,
    selectedFilterKey,
    view,
    handleSortPress,
    onFilterSelect,
    onOptionsModalClose,
    onOptionsPress,
    onSelectModePress: () => setIsSelectMode(!isSelectMode),
    onTableOptionChange,
    onViewSelect,
    setIsSelectMode,
    setJumpToCharacter,
    handleFirstPagePress,
    handlePreviousPagePress,
    handleNextPagePress,
    handleLastPagePress,
    handlePageSelect,
  };
}
