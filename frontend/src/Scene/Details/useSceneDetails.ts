import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { queryClient } from 'App/queryClient';
import * as commandNames from 'Commands/commandNames';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Movie from 'Movie/Movie';
import { executeCommand } from 'Store/Actions/commandActions';

const PATH = 'movie';

export const useSceneDetails = (foreignId: string) => {
  const dispatch = useDispatch();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const prevSceneRef = useRef<Movie | undefined>();

  // Lookup scene by foreignId using useQuery (same endpoint as movies)
  const {
    data: scene,
    error: sceneDetailsError,
    isFetching: sceneDetailsLoading,
  } = useApiQuery<Movie>({
    path: `/${PATH}/byForeignId/${foreignId}`,
  });

  useEffect(() => {
    if (scene?.id) {
      queryClient.setQueryData([`/${PATH}/${scene.id}`], scene);
    }
  }, [scene, foreignId]);

  const sceneId = scene?.id;

  // Mutation for toggling monitored state
  // This mutation will update the scene and then update the cache for the scene details
  const monitorToggleMutation = useApiMutation<Movie, Movie>({
    method: 'PUT',
    path: sceneId ? `/${PATH}/${sceneId}` : '',
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
    if (!sceneId) return;
    setIsManualRefresh(true);
    dispatch(
      executeCommand({
        name: commandNames.REFRESH_MOVIE,
        movieIds: [sceneId],
      })
    );
  }

  // When scene data changes, clear manual refresh
  useEffect(() => {
    if (isManualRefresh && scene && prevSceneRef.current !== scene) {
      setIsManualRefresh(false);
    }
    prevSceneRef.current = scene;
  }, [scene, isManualRefresh]);

  function onSearchPress() {
    if (!sceneId) return;
    dispatch(
      executeCommand({
        name: commandNames.MOVIE_SEARCH,
        movieIds: [sceneId],
      })
    );
  }

  function onMonitorTogglePress(monitored: boolean) {
    if (!scene || !sceneId) throw new Error('Scene data not loaded');
    // Clone the scene object and update monitored field
    const updatedScene = {
      ...scene,
      monitored,
    };
    monitorToggleMutation.mutate(updatedScene);
  }

  return {
    scene,
    sceneId,
    isSceneDetailsFetching:
      sceneDetailsLoading || monitorToggleMutation.isPending || isManualRefresh,
    isManualRefresh,
    sceneDetailsError: sceneDetailsError || monitorToggleMutation.error,
    onRefreshPress,
    onSearchPress,
    onMonitorTogglePress,
  };
};
