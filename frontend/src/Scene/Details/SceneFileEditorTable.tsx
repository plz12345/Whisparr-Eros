import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { SortDirection } from 'Helpers/Props/sortDirections';
import { MovieFile } from 'MovieFile/MovieFile';
import {
  deleteMovieFile,
  setMovieFilesSort,
  setMovieFilesTableOption,
} from 'Store/Actions/movieFileActions';
import {
  fetchLanguages,
  fetchQualityProfileSchema,
} from 'Store/Actions/settingsActions';
import MovieFileEditorTableContent from '../../MovieFile/Editor/MovieFileEditorTableContent';
import styles from '../../MovieFile/Editor/MovieFileEditorTable.css';

interface SceneFileEditorTableProps {
  sceneId: number;
  movieFileId?: number;
  movieFile?: MovieFile;
}

/**
 * Scene-specific file editor table component
 * Separated from MovieFileEditorTable to allow independent customization
 */
function SceneFileEditorTable({
  sceneId,
  movieFileId,
  movieFile,
}: SceneFileEditorTableProps) {
  const dispatch = useDispatch();
  const movieFiles = useSelector((state: AppState) => state.movieFiles);

  useEffect(() => {
    dispatch(fetchLanguages());
    dispatch(fetchQualityProfileSchema());
  }, [dispatch]);

  const queryParams = movieFileId
    ? { movieFileIds: [movieFileId] }
    : { movieId: [sceneId] };

  const { data: apiMovieFiles } = useApiQuery<MovieFile[]>({
    path: '/moviefile',
    queryParams,
    queryOptions: {
      enabled: !movieFile && (!!movieFileId || !!sceneId),
    },
  });

  const items = useMemo(() => {
    if (movieFile) {
      return [movieFile];
    }

    return apiMovieFiles ?? [];
  }, [movieFile, apiMovieFiles]);

  const onDeletePress = useCallback(
    (movieFileId: number) => {
      dispatch(deleteMovieFile({ id: movieFileId }));
    },
    [dispatch]
  );

  const onTableOptionChange = useCallback(
    (payload: unknown) => {
      dispatch(setMovieFilesTableOption(payload));
    },
    [dispatch]
  );

  const onSortPress = useCallback(
    (name: string, sortDirection?: SortDirection) => {
      dispatch(
        setMovieFilesSort({
          sortKey: name,
          sortDirection: sortDirection ?? movieFiles.sortDirection,
        })
      );
    },
    [dispatch, movieFiles.sortDirection]
  );

  return (
    <div className={styles.container}>
      <MovieFileEditorTableContent
        items={items}
        columns={movieFiles.columns}
        sortKey={movieFiles.sortKey}
        sortDirection={movieFiles.sortDirection as SortDirection}
        isDeleting={movieFiles.isDeleting}
        onDeletePress={onDeletePress}
        onTableOptionChange={onTableOptionChange}
        onSortPress={onSortPress}
      />
    </div>
  );
}

export default SceneFileEditorTable;
