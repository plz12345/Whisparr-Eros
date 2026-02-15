import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { queryClient } from 'App/queryClient';
import * as commandNames from 'Commands/commandNames';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Movie from 'Movie/Movie';
import { executeCommand } from 'Store/Actions/commandActions';

const PATH = 'movie';

export const useMovieDetails = (foreignId: string) => {
  const dispatch = useDispatch();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const prevMovieRef = useRef<Movie | undefined>();

  // Lookup movie by foreignId using useQuery
  const {
    data: movie,
    error: movieDetailsError,
    isFetching: movieDetailsLoading,
  } = useApiQuery<Movie>({
    path: `/${PATH}/byForeignId/${foreignId}`,
  });

  useEffect(() => {
    if (movie?.id) {
      queryClient.setQueryData([`/${PATH}/${movie.id}`], movie);
    }
  }, [movie, foreignId]);

  const movieId = movie?.id;

  // Mutation for toggling monitored state
  // This mutation will update the movie and then update the cache for the movie details
  const monitorToggleMutation = useApiMutation<Movie, Movie>({
    method: 'PUT',
    path: movieId ? `/${PATH}/${movieId}` : '',
    mutationOptions: {
      onSuccess: (data) => {
        if (data?.foreignId) {
          queryClient.setQueryData(
            [`/${PATH}/${data.foreignId}`],
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
    if (!movieId) return;
    setIsManualRefresh(true);
    dispatch(
      executeCommand({
        name: commandNames.REFRESH_MOVIE,
        movieIds: [movieId],
      })
    );
  }

  // When movie data changes, clear manual refresh
  useEffect(() => {
    if (isManualRefresh && movie && prevMovieRef.current !== movie) {
      setIsManualRefresh(false);
    }
    prevMovieRef.current = movie;
  }, [movie, isManualRefresh]);

  function onSearchPress() {
    if (!movieId) return;
    dispatch(
      executeCommand({
        name: commandNames.MOVIE_SEARCH,
        movieIds: [movieId],
      })
    );
  }

  function onMonitorTogglePress(monitored: boolean) {
    if (!movie || !movieId) throw new Error('Movie data not loaded');
    // Clone the movie object and update monitored field
    const updatedMovie = {
      ...movie,
      monitored,
    };
    monitorToggleMutation.mutate(updatedMovie);
  }

  return {
    movie,
    movieId,
    isMovieDetailsFetching:
      movieDetailsLoading || monitorToggleMutation.isPending || isManualRefresh,
    isManualRefresh,
    movieDetailsError: movieDetailsError || monitorToggleMutation.error,
    onRefreshPress,
    onSearchPress,
    onMonitorTogglePress,
  };
};
