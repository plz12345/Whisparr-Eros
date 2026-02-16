import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import ModelBase from 'App/ModelBase';
import { useSelect } from 'App/SelectContext';
import AppState from 'App/State/AppState';
import { filters } from 'Store/Actions/movieActions';
import {
  setMovieFilter,
  setMoviePage,
  setMovieSort,
  setMovieTableOption,
  setMovieView,
} from 'Store/Actions/movieIndexActions';
import { createCustomFiltersSelector } from 'Store/Selectors/createClientSideCollectionSelector';
import { useMovieIndexQuery } from './useMovieIndexQuery';

/**
 * Custom hook for managing the Movie Index page state and interactions.
 *
 * Provides a centralized interface for:
 * - Server-side paginated movie data fetching
 * - Pagination controls and state management
 * - Sorting and filtering operations
 * - View mode toggling (table, posters, etc.)
 * - UI interactions (options modal, select mode, etc.)
 *
 * @returns An object containing movie data, state, and event handlers
 */
export function useMovieIndex() {
  // Paging and sorting state from Redux store
  // filters is imported from Store/Actions/movieIndexActions - a constant array of Filter objects
  const customFilters = useSelector(createCustomFiltersSelector('movieIndex'));
  const columns = useSelector((state: AppState) => state.movieIndex.columns);
  const selectedFilterKey = useSelector(
    (state: AppState) => state.movieIndex.selectedFilterKey
  );
  const sortKey = useSelector((state: AppState) => state.movieIndex.sortKey);
  const sortDirection = useSelector(
    (state: AppState) => state.movieIndex.sortDirection
  );
  const page = useSelector((state: AppState) => state.movieIndex.page);
  const view = useSelector((state: AppState) => state.movieIndex.view);

  const history = useHistory();
  const dispatch = useDispatch();

  // Read pageSize from the appropriate options based on view
  const pageSize = useSelector((state: AppState) => {
    if (view === 'overview') {
      return state.movieIndex.overviewOptions?.pageSize ?? 25;
    }
    if (view === 'posters') {
      return state.movieIndex.posterOptions?.pageSize ?? 25;
    }
    return state.movieIndex.tableOptions?.pageSize ?? 25;
  });

  // Build query parameters for data fetching
  const queryParams = {
    page,
    pageSize,
    sortKey,
    sortDirection,
    filters: [], // Empty filters array - the API uses selectedFilterKey instead
  };

  // Fetch movie data with React Query, keeping previous data during refetch
  const { data, isPending } = useMovieIndexQuery(queryParams, {
    placeholderData: (prev) => prev,
  });

  // UI state
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState<boolean>(false);
  const [jumpToCharacter, setJumpToCharacter] = useState<string | undefined>(
    undefined
  );
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);

  // Pagination handlers

  const totalRecords = data?.totalRecords || 0;
  const totalPages = data ? Math.ceil(data.totalRecords / pageSize) : 1;

  /** Navigate to the first page */
  const handleFirstPagePress = () => dispatch(setMoviePage(1));

  /** Navigate to the previous page (clamped to page 1) */
  const handlePreviousPagePress = () =>
    dispatch(setMoviePage(Math.max(1, page - 1)));

  /** Navigate to the next page (clamped to last page) */
  const handleNextPagePress = () =>
    dispatch(setMoviePage(Math.min(totalPages, page + 1)));

  /** Navigate to the last page */
  const handleLastPagePress = () => dispatch(setMoviePage(totalPages));

  /** Navigate to a specific page */
  const handlePageSelect = (newPage: number) => dispatch(setMoviePage(newPage));

  /** Open the table options modal */
  const onOptionsPress = useCallback(() => {
    setIsOptionsModalOpen(true);
  }, [setIsOptionsModalOpen]);

  /** Close the table options modal */
  const onOptionsModalClose = useCallback(() => {
    setIsOptionsModalOpen(false);
  }, [setIsOptionsModalOpen]);

  /** Navigate to the add movie page */
  const onAddMoviePress = useCallback(() => {
    history.push('/add/new/movie');
  }, [history]);

  /** Handle changes to table display options (columns, etc.) */
  const onTableOptionChange = useCallback(
    (payload: unknown) => {
      dispatch(setMovieTableOption(payload));
    },
    [dispatch]
  );

  /**
   * Monitors isSelectMode and reinitializes the selection state when entering select mode.
   * This ensures that the select all button works correctly after exiting and re-entering select mode.
   */
  function MovieSelectModeReinitializer({
    isSelectMode,
    items,
  }: {
    isSelectMode: boolean;
    items: ModelBase[];
  }) {
    const [, selectDispatch] = useSelect();

    // When entering select mode, reinitialize the selection state based on current items
    useEffect(() => {
      if (isSelectMode) {
        selectDispatch({ type: 'updateItems', items });
      }
    }, [isSelectMode, items, selectDispatch]);

    return null;
  }

  /**
   * Handle filter selection from the filter menu
   * Resets to first page
   */
  const onFilterSelect = useCallback(
    (value: string | number) => {
      dispatch(setMovieFilter({ selectedFilterKey: value }));
      dispatch(setMoviePage(1));
    },
    [dispatch]
  );

  /** Toggle multi-select mode for bulk operations */
  const onSelectModePress = useCallback(() => {
    setIsSelectMode(!isSelectMode);
  }, [isSelectMode, setIsSelectMode]);

  /**
   * Change the sort column and reset to first page
   * @param value - The column key to sort by
   */
  const handleSortPress = useCallback(
    (value: string) => {
      dispatch(setMovieSort({ sortKey: value }));
      dispatch(setMoviePage(1));
    },
    [dispatch]
  );

  /**
   * Change the view mode (table, posters, overview, etc.) and scroll to top
   * @param value - table | posters | overview
   */
  const onViewSelect = useCallback(
    (value: string) => {
      dispatch(setMovieView({ view: value }));

      if (scrollerRef.current) {
        scrollerRef.current.scrollTo(0, 0);
      }
    },
    [scrollerRef, dispatch]
  );

  // Memoize items to ensure SelectProvider receives consistent references for its useEffect
  const memoizedItems = useMemo(() => data?.records || [], [data?.records]);

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
    handleFirstPagePress,
    handleLastPagePress,
    handleNextPagePress,
    handlePageSelect,
    handlePreviousPagePress,
    handleSortPress,
    MovieSelectModeReinitializer,
    onAddMoviePress,
    onFilterSelect,
    onOptionsModalClose,
    onOptionsPress,
    onSelectModePress,
    onTableOptionChange,
    onViewSelect,
    setIsSelectMode,
    setJumpToCharacter,
  };
}
