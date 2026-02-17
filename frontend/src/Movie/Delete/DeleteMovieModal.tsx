import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import Movie from 'Movie/Movie';
import DeleteMovieModalContent from './DeleteMovieModalContent';

interface DeleteMovieModalProps {
  isOpen: boolean;
  movie: Movie;
  onModalClose: () => void;
}

function DeleteMovieModal({
  isOpen,
  movie,
  onModalClose,
}: DeleteMovieModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={onModalClose}>
      <DeleteMovieModalContent movie={movie} onModalClose={onModalClose} />
    </Modal>
  );
}

export default DeleteMovieModal;
