import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import AppState from 'App/State/AppState';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import { setDeleteOption } from 'Store/Actions/movieActions';
import translate from 'Utilities/String/translate';
import styles from './DeleteMovieModalContent.css';

type DeleteMovieModalContentProps = {
  movieIds: number[];
  onDeletePress: (deleteFiles: boolean, addImportExclusion: boolean) => void;
  onModalClose: () => void;
};

function DeleteMovieModalContent(props: DeleteMovieModalContentProps) {
  const selectDeleteOptions = createSelector(
    (state: AppState) => state.movies.deleteOptions,
    (deleteOptions) => deleteOptions
  );

  const { movieIds, onDeletePress, onModalClose } = props;
  const { addImportExclusion } = useSelector(selectDeleteOptions);
  const dispatch = useDispatch();
  const [deleteFiles, setDeleteFiles] = useState(false);

  const onDeleteFilesChange = useCallback((e: { value: boolean }) => {
    setDeleteFiles(e.value);
  }, []);

  const onDeleteOptionChange = useCallback(
    ({ name, value }: { name: string; value: boolean }) => {
      dispatch(
        setDeleteOption({
          [name]: value,
        })
      );
    },
    [dispatch]
  );

  const onDeleteMoviesConfirmed = useCallback(() => {
    setDeleteFiles(false);
    onDeletePress(deleteFiles, addImportExclusion);
  }, [deleteFiles, addImportExclusion, onDeletePress]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {movieIds.length > 1
          ? translate('DeleteSelectedMovies')
          : translate('DeleteSelectedMovie')}
      </ModalHeader>

      <ModalBody>
        <div>
          <FormGroup>
            <FormLabel>{translate('AddListExclusion')}</FormLabel>
            <FormInputGroup
              type={inputTypes.CHECK}
              name="addImportExclusion"
              value={addImportExclusion}
              helpText={translate('AddImportExclusionHelpText')}
              onChange={onDeleteOptionChange}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>
              {movieIds.length > 1
                ? translate('DeleteMovieFolders')
                : translate('DeleteMovieFolder')}
            </FormLabel>
            <FormInputGroup
              type={inputTypes.CHECK}
              name="deleteFiles"
              value={deleteFiles}
              helpText={
                movieIds.length > 1
                  ? translate('DeleteMovieFoldersHelpText')
                  : translate('DeleteMovieFolderHelpText')
              }
              kind="danger"
              onChange={onDeleteFilesChange}
            />
          </FormGroup>
        </div>
        <div className={styles.message}>
          {deleteFiles
            ? translate('DeleteMovieFolderCountWithFilesConfirmation', {
                count: movieIds.length,
              })
            : translate('DeleteMovieFolderCountConfirmation', {
                count: movieIds.length,
              })}
        </div>
        {/* Could show more details if needed */}
      </ModalBody>
      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>
        <Button kind={kinds.DANGER} onPress={onDeleteMoviesConfirmed}>
          {translate('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default DeleteMovieModalContent;
