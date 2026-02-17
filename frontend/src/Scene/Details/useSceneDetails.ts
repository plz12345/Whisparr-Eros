import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { queryClient } from 'App/queryClient';
import * as commandNames from 'Commands/commandNames';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { executeCommand } from 'Store/Actions/commandActions';

const PATH = 'movie';

export function useSceneDetails(sceneId: string | number) {
  const dispatch = useDispatch();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const prevSceneRef = useRef<any>();

  // Lookup scene by id using useApiQuery
  const {
    data: scene,
    error: sceneDetailsError,
    isFetching: sceneDetailsLoading,
  } = useApiQuery<any>({
    path: `/${PATH}/${sceneId}`,
  });

  useEffect(() => {
    if (scene?.id) {
      queryClient.setQueryData([`/${PATH}/${scene.id}`], scene);
    }
  }, [scene, sceneId]);

  const sceneIdNum = scene?.id;

  // Mutation for toggling monitored state
  const monitorToggleMutation = useApiMutation<any, any>({
    method: 'PUT',
    path: sceneIdNum ? `/${PATH}/${sceneIdNum}` : '',
    mutationOptions: {
      onSuccess: (data) => {
        if (data?.id) {
          queryClient.setQueryData([`/${PATH}/${data.id}`], (oldData: any) => {
            if (!oldData || typeof oldData !== 'object') {
              return data;
            }
            return { ...oldData, ...data };
          });
        }
      },
    },
  });

  function onRefreshPress() {
    if (!sceneIdNum) return;
    setIsManualRefresh(true);
    dispatch(
      executeCommand({
        name: commandNames.REFRESH_MOVIE,
        movieIds: [sceneIdNum],
      })
    );
  }

  useEffect(() => {
    if (isManualRefresh && scene && prevSceneRef.current !== scene) {
      setIsManualRefresh(false);
    }
    prevSceneRef.current = scene;
  }, [scene, isManualRefresh]);

  function onSearchPress() {
    if (!sceneIdNum) return;
    dispatch(
      executeCommand({
        name: commandNames.MOVIE_SEARCH,
        movieIds: [sceneIdNum],
      })
    );
  }

  function onMonitorTogglePress(monitored: boolean) {
    if (!scene || !sceneIdNum) throw new Error('Scene data not loaded');
    const updatedScene = {
      ...scene,
      monitored,
    };
    monitorToggleMutation.mutate(updatedScene);
  }

  return {
    scene,
    sceneId: sceneIdNum,
    isSceneDetailsFetching:
      sceneDetailsLoading || monitorToggleMutation.isPending || isManualRefresh,
    isManualRefresh,
    sceneDetailsError: sceneDetailsError || monitorToggleMutation.error,
    onRefreshPress,
    onSearchPress,
    onMonitorTogglePress,
  };
}
