import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import Movie from 'Movie/Movie';

// API endpoints (adjust as needed)
const MOVIE_LIST_ENDPOINT = '/movie/list';
const MOVIE_ENDPOINT = '/movie';

export function useMovies() {
  const queryClient = useQueryClient();

  // Fetch all movies
  const {
    data: movies,
    isLoading,
    error,
    refetch,
  } = useQuery<Movie[]>([MOVIE_LIST_ENDPOINT], async () => {
    const { data } = await axios.get(MOVIE_LIST_ENDPOINT);
    return data;
  });

  // Add a movie
  const addMovieMutation = useMutation(
    (newMovie: Partial<Movie>) => axios.post(MOVIE_ENDPOINT, newMovie),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([MOVIE_LIST_ENDPOINT]);
      },
    }
  );

  // Delete a movie
  const deleteMovieMutation = useMutation(
    (id: number | string) => axios.delete(`${MOVIE_ENDPOINT}/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([MOVIE_LIST_ENDPOINT]);
      },
    }
  );

  // Update a movie
  const updateMovieMutation = useMutation(
    (movie: Movie) => axios.put(`${MOVIE_ENDPOINT}/${movie.id}`, movie),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([MOVIE_LIST_ENDPOINT]);
      },
    }
  );

  return {
    movies,
    isLoading,
    error,
    refetch,
    addMovie: addMovieMutation.mutate,
    addMovieStatus: addMovieMutation.status,
    deleteMovie: deleteMovieMutation.mutate,
    deleteMovieStatus: deleteMovieMutation.status,
    updateMovie: updateMovieMutation.mutate,
    updateMovieStatus: updateMovieMutation.status,
  };
}
