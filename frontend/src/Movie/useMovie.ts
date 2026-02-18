import { useMutation } from '@tanstack/react-query';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import useQueryClient from 'Helpers/Hooks/useQueryClient';
import Movie from 'Movie/Movie';
import fetchJson from 'Utilities/Fetch/fetchJson';

const API_PREFIX = '/api/v3';
const MOVIE_ENDPOINT = `${API_PREFIX}/movie`;
const MOVIE_LIST_ENDPOINT = `${API_PREFIX}/movie/list`;
const API_HEADERS = {
  'X-Api-Key': window.Whisparr.apiKey,
  'X-Whisparr-Client': 'Whisparr',
};

// Search movies (by query string)
export function useSearchMovies(query: string) {
  return useApiQuery<Movie[]>({
    path: `${MOVIE_ENDPOINT}/search`,
    queryParams: { query },
  });
}

// Fetch a single movie by id
export function useFetchMovie(id: number | string) {
  return useApiQuery<Movie>({
    path: `${MOVIE_ENDPOINT}/${id}`,
  });
}

// Add a movie
export function useAddMovie(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useApiMutation<Movie, Partial<Movie>>({
    path: MOVIE_ENDPOINT,
    method: 'POST',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === MOVIE_LIST_ENDPOINT,
        });
        options?.onSuccess?.();
      },
    },
  });
}

// Update a movie
export function useUpdateMovie(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useApiMutation<Movie, Movie>({
    path: MOVIE_ENDPOINT,
    method: 'PUT',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === MOVIE_LIST_ENDPOINT,
        });
        options?.onSuccess?.();
      },
    },
  });
}

// Delete a movie
export function useDeleteMovie(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    unknown,
    { id: number | string; deleteFiles?: boolean; addImportExclusion?: boolean }
  >({
    mutationFn: async ({
      id,
      deleteFiles = false,
      addImportExclusion = false,
    }: {
      id: number | string;
      deleteFiles?: boolean;
      addImportExclusion?: boolean;
    }) => {
      const fullPath = `${API_PREFIX}/movie/${id}?deleteFiles=${deleteFiles}&addImportExclusion=${addImportExclusion}`;
      try {
        await fetchJson({
          path: fullPath,
          method: 'DELETE',
          headers: API_HEADERS,
        });
        return;
      } catch (err) {
        // Only treat empty JSON parse error as success
        if (err instanceof SyntaxError && /JSON\.parse/.test(err.message)) {
          return;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MOVIE_LIST_ENDPOINT] });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      console.log('useDeleteMovie onError called', error);
    },
  });
}

// Bulk delete movies
export function useBulkDeleteMovie(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useApiMutation<void, { ids: (number | string)[] }>({
    path: `${MOVIE_ENDPOINT}/editor`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === MOVIE_LIST_ENDPOINT,
        });
        options?.onSuccess?.();
      },
    },
  });
}

// Bulk monitor movies
/*
export function useBulkMonitorMovie(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useApiMutation<void, { ids: (number | string)[]; monitored: boolean }>(
    {
      path: `${MOVIE_ENDPOINT}/bulk/monitor`,
      method: 'PATCH',
      mutationOptions: {
        onSuccess: () => {
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === MOVIE_LIST_ENDPOINT,
          });
          options?.onSuccess?.();
        },
      },
    }
  );
}
*/
