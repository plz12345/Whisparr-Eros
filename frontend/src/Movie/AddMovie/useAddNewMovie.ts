import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Error as AppError } from 'App/State/AppSectionState';
import AppState from 'App/State/AppState';
import { ValidationMessage } from 'Components/Form/FormInputGroup';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Movie from 'Movie/Movie';
import {
  addMovie,
  clearAddMovie,
  lookupMovie,
  setAddMovieDefault,
  setMoviesWithStatus,
} from 'Store/Actions/addMovieActions';
import {
  clearQueueDetails,
  fetchQueueDetails,
} from 'Store/Actions/queueActions';
import { fetchRootFolders } from 'Store/Actions/rootFolderActions';
import createDimensionsSelector from 'Store/Selectors/createDimensionsSelector';
import createSystemStatusSelector from 'Store/Selectors/createSystemStatusSelector';
import createUISettingsSelector from 'Store/Selectors/createUISettingsSelector';
import selectSettings from 'Store/Selectors/selectSettings';
import { InputChanged } from 'typings/inputs';

export interface MovieWithExistingStatus {
  movie: Movie;
  isExistingMovie: boolean;
}

interface LookupMovieItem {
  foreignId: string;
  movie: Movie;
  id: string;
  internalId: number;
}

interface MovieDefaults {
  rootFolderPath: string;
  monitored: boolean;
  moviesMonitored: boolean;
  qualityProfileId: number;
  searchForMovie: boolean;
  tags: number[];
}

interface SettingValue<T> {
  value: T;
  errors?: ValidationMessage[];
  warnings?: ValidationMessage[];
  pending?: boolean;
  previousValue?: T;
}

interface AddMovieSettings {
  rootFolderPath: SettingValue<string>;
  monitored: SettingValue<boolean>;
  moviesMonitored: SettingValue<boolean>;
  qualityProfileId: SettingValue<number>;
  searchForMovie: SettingValue<boolean>;
  tags: SettingValue<number[]>;
}

interface AddMovieState {
  isPopulated: boolean;
  error: AppError | null;
  isAdding: boolean;
  isFetching: boolean;
  isAdded: boolean;
  addError: AppError | null;
  items: LookupMovieItem[];
  moviesWithStatus: MovieWithExistingStatus[];
  MovieDefaults: MovieDefaults;
}

type RootState = AppState & {
  addMovie: AddMovieState;
};

const defaultMovieDefaults: MovieDefaults = {
  rootFolderPath: '',
  monitored: true,
  moviesMonitored: false,
  qualityProfileId: 0,
  searchForMovie: false,
  tags: [],
};

function useAddNewMovie() {
  const dispatch = useDispatch();
  const addMovie = useSelector((state: RootState) => state.addMovie);
  const uiSettings = useSelector(createUISettingsSelector());
  const [term, setTerm] = useState('');

  const MovieLookupTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  React.useEffect(() => {
    dispatch(fetchRootFolders());
    dispatch(fetchQueueDetails());
    return () => {
      if (MovieLookupTimeout.current) {
        clearTimeout(MovieLookupTimeout.current);
      }
      dispatch(clearAddMovie());
      dispatch(clearQueueDetails());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When lookup results change, check which Movies already exist
  // React Query: fetch existing movies by foreignIds
  const foreignIds = (addMovie?.items || [])
    .map((item: LookupMovieItem) => item.movie.foreignId)
    .filter((id: string | undefined) => id);

  const {
    data: existingMovies,
    isLoading: isExistingMoviesLoading,
    error: existingMoviesError,
  } = useApiQuery<Movie[]>({
    path: '/movie/list',
    method: 'POST',
    body: foreignIds,
    queryOptions: {
      enabled: foreignIds.length > 0,
      retry: false,
    },
  });

  React.useEffect(() => {
    if (addMovie?.items && addMovie.items.length > 0 && foreignIds.length > 0) {
      if (isExistingMoviesLoading) return;
      if (existingMoviesError) {
        // fallback: mark all as not existing
        const mapped = addMovie.items.map((item: LookupMovieItem) => ({
          movie: item.movie,
          isExistingMovie: false,
        }));
        const current = addMovie.moviesWithStatus || [];
        const isDifferent =
          mapped.length !== current.length ||
          mapped.some(
            (m, i) =>
              !current[i] ||
              m.isExistingMovie !== current[i].isExistingMovie ||
              m.movie?.foreignId !== current[i].movie?.foreignId
          );
        if (isDifferent) {
          dispatch(setMoviesWithStatus(mapped));
        }
        return;
      }
      if (existingMovies) {
        const existingMovieMap = new Map(
          existingMovies.map((p) => [p.foreignId, p])
        );
        const mapped = addMovie.items.map((item: LookupMovieItem) => {
          const fullMovie = existingMovieMap.get(item.movie.foreignId);
          return {
            movie: fullMovie || item.movie,
            isExistingMovie: !!fullMovie,
          };
        });
        const current = addMovie.moviesWithStatus || [];
        const isDifferent =
          mapped.length !== current.length ||
          mapped.some(
            (m, i) =>
              !current[i] ||
              m.isExistingMovie !== current[i].isExistingMovie ||
              m.movie?.foreignId !== current[i].movie?.foreignId
          );
        if (isDifferent) {
          dispatch(setMoviesWithStatus(mapped));
        }
      }
    } else if ((addMovie.moviesWithStatus || []).length > 0) {
      dispatch(setMoviesWithStatus([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addMovie?.items,
    addMovie.moviesWithStatus,
    foreignIds,
    existingMovies,
    isExistingMoviesLoading,
    existingMoviesError,
    dispatch,
  ]);

  const onMovieLookupChange = React.useCallback(
    (value: string) => {
      setTerm(value);
      if (MovieLookupTimeout.current) {
        clearTimeout(MovieLookupTimeout.current);
      }
      if (value.trim() === '') {
        dispatch(clearAddMovie());
      } else {
        MovieLookupTimeout.current = setTimeout(() => {
          dispatch(lookupMovie({ term: value }));
        }, 300);
      }
    },
    [dispatch]
  );

  const onClearMovieLookupPress = React.useCallback(() => {
    setTerm('');
    dispatch(clearAddMovie());
  }, [dispatch]);

  return {
    isPopulated: addMovie?.isPopulated || false,
    error: addMovie?.error,
    isAdding: addMovie?.isAdding || false,
    isFetching: addMovie?.isFetching || false,
    isAdded: addMovie?.isAdded || false,
    addError: addMovie?.addError,
    items: addMovie?.items || [],
    moviesWithStatus: addMovie?.moviesWithStatus || [],
    term,
    colorImpairedMode: uiSettings.enableColorImpairedMode,
    onMovieLookupChange,
    onClearMovieLookupPress,
  };
}

export function useAddNewMovieSearchResult() {
  const dimensions = useSelector(createDimensionsSelector());
  const safeForWorkMode = useSelector(
    (state: AppState) => state.settings.safeForWorkMode
  );

  return {
    isSmallScreen: dimensions.isSmallScreen,
    safeForWorkMode,
  };
}

export function useAddNewMovieModalContent(foreignId: string) {
  const dispatch = useDispatch();
  const { isSmallScreen } = useSelector(createDimensionsSelector());
  const systemStatus = useSelector(createSystemStatusSelector());
  const safeForWorkMode = useSelector(
    (state: AppState) => state.settings.safeForWorkMode
  );
  const addMovieState = useSelector((state: RootState) => state.addMovie);
  const {
    isAdding = false,
    addError,
    items = [],
    movieDefaults = defaultMovieDefaults,
  } = addMovieState || {};

  // Find the selected movie's defaults if available
  const selected = items.find((item) => item.foreignId === foreignId);
  const initialDefaults = selected
    ? {
        ...movieDefaults,
        ...selected.movie,
        qualityProfileId:
          selected.movie.qualityProfileId ||
          movieDefaults.qualityProfileId ||
          0,
        rootFolderPath:
          selected.movie.rootFolderPath || movieDefaults.rootFolderPath || '',
        monitored:
          typeof selected.movie.monitored === 'boolean'
            ? selected.movie.monitored
            : movieDefaults.monitored,
        moviesMonitored:
          typeof selected.movie.moviesMonitored === 'boolean'
            ? selected.movie.moviesMonitored
            : movieDefaults.moviesMonitored,
        searchForMovie:
          typeof selected.movie.searchForMovie === 'boolean'
            ? selected.movie.searchForMovie
            : movieDefaults.searchForMovie,
        tags: Array.isArray(selected.movie.tags)
          ? selected.movie.tags
          : movieDefaults.tags || [],
      }
    : movieDefaults;

  // Local state for form changes
  const [pending, setPending] = React.useState<Partial<typeof initialDefaults>>(
    {}
  );

  const { settings, validationErrors, validationWarnings } = selectSettings(
    initialDefaults,
    pending,
    addError
  ) as {
    settings: AddMovieSettings;
    validationErrors: unknown[];
    validationWarnings: unknown[];
  };

  const onInputChange = React.useCallback((change: InputChanged) => {
    setPending((prev) => ({ ...prev, [change.name]: change.value }));
  }, []);

  const onAddMoviePress = React.useCallback(() => {
    dispatch(
      addMovie({
        foreignId,
        rootFolderPath: settings.rootFolderPath.value,
        monitored: settings.monitored.value === true,
        moviesMonitored: settings.moviesMonitored.value === true,
        qualityProfileId: settings.qualityProfileId.value,
        searchForMovie: settings.searchForMovie.value,
        tags: settings.tags.value,
      })
    );
  }, [dispatch, foreignId, settings]);

  return {
    addError,
    isAdding,
    isSmallScreen,
    isWindows: systemStatus.isWindows,
    safeForWorkMode,
    settings,
    validationErrors,
    validationWarnings,
    onInputChange,
    onAddMoviePress,
  };
}

export default useAddNewMovie;
