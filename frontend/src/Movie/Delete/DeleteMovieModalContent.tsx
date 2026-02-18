import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import AppState from 'App/State/AppState';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { icons, inputTypes, kinds } from 'Helpers/Props';
import Movie, { Statistics } from 'Movie/Movie';
import { useDeleteMovie } from 'Movie/useMovie';
import { setDeleteOption } from 'Store/Actions/movieActions';
import { CheckInputChanged } from 'typings/inputs';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './DeleteMovieModalContent.css';

export interface DeleteMovieModalContentProps {
  movie: Movie;
  onModalClose: () => void;
}

function DeleteMovieModalContent({
  movie,
  onModalClose,
}: DeleteMovieModalContentProps) {
  const history = useHistory();
  const dispatch = useDispatch();

  const { title, path, statistics = {} as Statistics, id } = movie || {};
  const { addImportExclusion } = useSelector(
    (state: AppState) => state.movies.deleteOptions
  );
  const { movieFileCount = 0, sizeOnDisk = 0 } = statistics;
  const [deleteFiles, setDeleteFiles] = useState(false);

  const deleteMovieMutation = useDeleteMovie({
    onSuccess: () => {
      history.push('/movies');
    },
  });

  // Handlers
  const handleDeleteOptionChange = useCallback(
    ({ name, value }: CheckInputChanged) => {
      dispatch(setDeleteOption({ [name]: value }));
    },
    [dispatch]
  );

  const handleDeleteFilesChange = useCallback(
    ({ value }: CheckInputChanged) => {
      setDeleteFiles(value);
    },
    []
  );

  const handleDeleteMovieConfirmed = useCallback(() => {
    if (!id) return;

    deleteMovieMutation.mutate({ id, deleteFiles, addImportExclusion });
  }, [id, deleteFiles, addImportExclusion, deleteMovieMutation]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('DeleteHeader', { title })}</ModalHeader>

      <ModalBody>
        <div className={styles.pathContainer}>
          <Icon className={styles.pathIcon} name={icons.FOLDER} />

          {path}
        </div>

        <FormGroup>
          <FormLabel>{translate('AddListExclusion')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="addImportExclusion"
            value={addImportExclusion}
            helpText={translate('AddListExclusionMovieHelpText')}
            kind={kinds.DANGER}
            onChange={handleDeleteOptionChange}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>
            {movieFileCount === 0
              ? translate('DeleteMovieFolder')
              : translate('DeleteMovieFiles', { movieFileCount })}
          </FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="deleteFiles"
            value={deleteFiles}
            helpText={
              movieFileCount === 0
                ? translate('DeleteMovieFolderHelpText')
                : translate('DeleteMovieFilesHelpText')
            }
            kind={kinds.DANGER}
            onChange={handleDeleteFilesChange}
          />
        </FormGroup>

        {deleteFiles ? (
          <div className={styles.deleteFilesMessage}>
            <div>
              <InlineMarkdown
                data={translate('DeleteMovieFolderConfirmation', { path })}
                blockClassName={styles.folderPath}
              />
            </div>

            {movieFileCount ? (
              <div className={styles.deleteCount}>
                {translate('DeleteMovieFolderMovieCount', {
                  movieFileCount,
                  size: formatBytes(sizeOnDisk),
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>

        <Button
          kind={kinds.DANGER}
          disabled={deleteMovieMutation.isPending}
          onPress={handleDeleteMovieConfirmed}
        >
          {deleteMovieMutation.isPending
            ? translate('Deleting')
            : translate('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default DeleteMovieModalContent;
