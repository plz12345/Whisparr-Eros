import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'Components/Modal/Modal';
import Movie from 'Movie/Movie';
import { clearPendingChanges } from 'Store/Actions/baseActions';
import EditMovieModalContent from './EditMovieModalContent';

interface EditMovieModalProps {
  isOpen: boolean;
  movie: Movie;
  onModalClose: () => void;
  onDeleteMoviePress: () => void;
}

function EditMovieModal({
  isOpen,
  movie,
  onModalClose,
  onDeleteMoviePress,
}: EditMovieModalProps) {
  const dispatch = useDispatch();

  const handleModalClose = useCallback(() => {
    dispatch(clearPendingChanges({ section: 'movies' }));
    onModalClose();
  }, [dispatch, onModalClose]);

  return (
    <Modal isOpen={isOpen} onModalClose={handleModalClose}>
      <EditMovieModalContent
        movie={movie}
        onModalClose={handleModalClose}
        onDeleteMoviePress={onDeleteMoviePress}
      />
    </Modal>
  );
}

export default EditMovieModal;
