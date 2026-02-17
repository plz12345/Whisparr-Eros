// Modal and UI state for MovieDetails
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { queryClient } from 'App/queryClient';
import * as commandNames from 'Commands/commandNames';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Movie from 'Movie/Movie';
import { executeCommand } from 'Store/Actions/commandActions';

const PATH = 'movie';

export function useMovieDetails(movieId: string | number) {
  const dispatch = useDispatch();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const prevMovieRef = useRef<unknown>();

  // Modal and UI state
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isEditMovieModalOpen, setIsEditMovieModalOpen] = useState(false);
  const [isDeleteMovieModalOpen, setIsDeleteMovieModalOpen] = useState(false);
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);
  const [isInteractiveSearchModalOpen, setIsInteractiveSearchModalOpen] =
    useState(false);
  const [isMovieHistoryModalOpen, setIsMovieHistoryModalOpen] = useState(false);
  const [overviewHeight, setOverviewHeight] = useState(0);
  const [titleWidth, setTitleWidth] = useState(0);

  // Modal handlers
  const onOrganizePress = useCallback(() => setIsOrganizeModalOpen(true), []);
  const onOrganizeModalClose = useCallback(
    () => setIsOrganizeModalOpen(false),
    []
  );
  const onInteractiveImportPress = useCallback(
    () => setIsInteractiveImportModalOpen(true),
    []
  );
  const onInteractiveImportModalClose = useCallback(
    () => setIsInteractiveImportModalOpen(false),
    []
  );
  const onEditMoviePress = useCallback(() => setIsEditMovieModalOpen(true), []);
  const onEditMovieModalClose = useCallback(
    () => setIsEditMovieModalOpen(false),
    []
  );
  const onInteractiveSearchPress = useCallback(
    () => setIsInteractiveSearchModalOpen(true),
    []
  );
  const onInteractiveSearchModalClose = useCallback(
    () => setIsInteractiveSearchModalOpen(false),
    []
  );
  const onDeleteMoviePress = useCallback(() => {
    setIsEditMovieModalOpen(false);
    setIsDeleteMovieModalOpen(true);
  }, []);
  const onDeleteMovieModalClose = useCallback(
    () => setIsDeleteMovieModalOpen(false),
    []
  );
  const onMovieHistoryPress = useCallback(
    () => setIsMovieHistoryModalOpen(true),
    []
  );
  const onMovieHistoryModalClose = useCallback(
    () => setIsMovieHistoryModalOpen(false),
    []
  );
  const onMeasure = useCallback(
    ({ height }: { height: number }) => setOverviewHeight(height),
    []
  );
  const onTitleMeasure = useCallback(
    ({ width }: { width: number }) => setTitleWidth(width),
    []
  );

  // Lookup movie by id using useApiQuery
  const {
    data: movie,
    error: movieDetailsError,
    isFetching: movieDetailsLoading,
  } = useApiQuery<Movie>({
    path: `/${PATH}/${movieId}`,
  });

  useEffect(() => {
    if (movie?.id) {
      queryClient.setQueryData([`/${PATH}/${movie.id}`], movie);
    }
  }, [movie, movieId]);

  const movieIdNum = movie?.id;

  // Mutation for toggling monitored state
  const monitorToggleMutation = useApiMutation<Movie, Movie>({
    method: 'PUT',
    path: movieIdNum ? `/${PATH}/${movieIdNum}` : '',
    mutationOptions: {
      onSuccess: (data) => {
        if (data?.id) {
          queryClient.setQueryData(
            [`/${PATH}/${data.id}`],
            (oldData: Movie) => {
              if (!oldData || typeof oldData !== 'object') {
                return data;
              }
              return { ...oldData, ...data };
            }
          );
        }
      },
    },
  });

  function onRefreshPress() {
    if (!movieIdNum) return;
    setIsManualRefresh(true);
    dispatch(
      executeCommand({
        name: commandNames.REFRESH_MOVIE,
        movieIds: [movieIdNum],
      })
    );
  }

  useEffect(() => {
    if (isManualRefresh && movie && prevMovieRef.current !== movie) {
      setIsManualRefresh(false);
    }
    prevMovieRef.current = movie;
  }, [movie, isManualRefresh]);

  function onSearchPress() {
    if (!movieIdNum) return;
    dispatch(
      executeCommand({
        name: commandNames.MOVIE_SEARCH,
        movieIds: [movieIdNum],
      })
    );
  }

  function onMonitorTogglePress(monitored: boolean) {
    if (!movie || !movieIdNum) throw new Error('Movie data not loaded');
    const updatedMovie = {
      ...movie,
      monitored,
    };
    monitorToggleMutation.mutate(updatedMovie);
  }

  // Placeholder/derived UI state and error fields for MovieDetails
  // TODO: Replace with real logic as needed
  const isSaving = monitorToggleMutation.isPending;
  const isRefreshing = isManualRefresh;
  const isSearching = false; // Set to true if a search is in progress
  const isFetching = movieDetailsLoading;
  const isSmallScreen = false; // Could be derived from a context or window size
  const movieFilesError = null; // Replace with actual error if available
  const extraFilesError = null; // Replace with actual error if available
  const movieCreditsError = null; // Replace with actual error if available
  const hasMovieFiles = true; // Replace with actual logic if available
  const queueItem = null; // Replace with actual queue item if available
  const movieRuntimeFormat = undefined; // Replace with actual format if needed

  return {
    movie,
    movieId: movieIdNum,
    isMovieDetailsFetching:
      movieDetailsLoading || monitorToggleMutation.isPending || isManualRefresh,
    isManualRefresh,
    movieDetailsError: movieDetailsError || monitorToggleMutation.error,
    onRefreshPress,
    onSearchPress,
    onMonitorTogglePress,
    // Modal/UI state and handlers
    isOrganizeModalOpen,
    setIsOrganizeModalOpen,
    isEditMovieModalOpen,
    setIsEditMovieModalOpen,
    isDeleteMovieModalOpen,
    setIsDeleteMovieModalOpen,
    isInteractiveImportModalOpen,
    setIsInteractiveImportModalOpen,
    isInteractiveSearchModalOpen,
    setIsInteractiveSearchModalOpen,
    isMovieHistoryModalOpen,
    setIsMovieHistoryModalOpen,
    overviewHeight,
    setOverviewHeight,
    titleWidth,
    setTitleWidth,
    onOrganizePress,
    onOrganizeModalClose,
    onInteractiveImportPress,
    onInteractiveImportModalClose,
    onEditMoviePress,
    onEditMovieModalClose,
    onInteractiveSearchPress,
    onInteractiveSearchModalClose,
    onDeleteMoviePress,
    onDeleteMovieModalClose,
    onMovieHistoryPress,
    onMovieHistoryModalClose,
    onMeasure,
    onTitleMeasure,
    // Added UI state and error fields for MovieDetails
    isSaving,
    isRefreshing,
    isSearching,
    isFetching,
    isSmallScreen,
    movieFilesError,
    extraFilesError,
    movieCreditsError,
    hasMovieFiles,
    queueItem,
    movieRuntimeFormat,
  };
}
