import React from 'react';
import Modal from 'Components/Modal/Modal';
import { Image } from 'Movie/Movie';
import AddNewMovieModalContent from './AddNewMovieModalContent';

interface AddNewMovieModalProps {
  isOpen: boolean;
  onModalClose: () => void;
  foreignId: string;
  title: string;
  images: Image[];
}

function AddNewMovieModal({
  isOpen,
  onModalClose,
  foreignId,
  title,
  images,
}: AddNewMovieModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <AddNewMovieModalContent
        foreignId={foreignId}
        title={title}
        images={images}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default AddNewMovieModal;
