import { createSelector } from 'reselect';
import AppState from 'App/State/AppState';
import Command from 'Commands/Command';
import { MOVIE_SEARCH, REFRESH_MOVIE } from 'Commands/commandNames';
import Movie from 'Movie/Movie';
import createExecutingCommandsSelector from 'Store/Selectors/createExecutingCommandsSelector';

function createSceneSelectorForHook(sceneId: number) {
  return (state: AppState) => {
    // Find the scene by id in the current sceneIndex items (AppSectionState<Movie>)
    const items = state.sceneIndex.items || [];
    return items.find((scene: Movie) => scene.id === sceneId);
  };
}

function createSceneQualityProfileSelector(sceneId: number) {
  return (state: AppState) => {
    const scene = createSceneSelectorForHook(sceneId)(state);
    if (!scene) return undefined;
    const profiles = state.settings.qualityProfiles.items || [];
    return profiles.find((profile) => profile.id === scene.qualityProfileId);
  };
}

function createSceneIndexItemSelector(sceneId: number) {
  return createSelector(
    createSceneSelectorForHook(sceneId),
    createSceneQualityProfileSelector(sceneId),
    createExecutingCommandsSelector(),
    (
      scene: Movie | undefined,
      qualityProfile,
      executingCommands: Command[]
    ) => {
      const isRefreshingScene = executingCommands.some((command) => {
        return (
          command.name === REFRESH_MOVIE && command.body.movieId === sceneId
        );
      });

      const isSearchingScene = executingCommands.some((command) => {
        return (
          command.name === MOVIE_SEARCH && command.body.movieId === sceneId
        );
      });

      return {
        scene,
        qualityProfile,
        isRefreshingScene,
        isSearchingScene,
      };
    }
  );
}

export default createSceneIndexItemSelector;
