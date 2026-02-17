import React from 'react';
import Modal from 'Components/Modal/Modal';
import DeleteMovieModalContent from './DeleteMovieModalContent';

interface DeleteMovieModalProps {
  isOpen: boolean;
  movieIds: number[];
  onDeletePress: (deleteFiles: boolean, addImportExclusion: boolean) => void;
  onModalClose(): void;
}

function DeleteMovieModal(props: DeleteMovieModalProps) {
  const { isOpen, movieIds, onDeletePress, onModalClose } = props;

  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <DeleteMovieModalContent
        movieIds={movieIds}
        onDeletePress={onDeletePress}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default DeleteMovieModal;
