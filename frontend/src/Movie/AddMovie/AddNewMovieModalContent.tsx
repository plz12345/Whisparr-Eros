import React from 'react';
import CheckInput from 'Components/Form/CheckInput';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import SpinnerButton from 'Components/Link/SpinnerButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import { Image } from 'Movie/Movie';
import MoviePoster from 'Movie/MoviePoster';
import { EnhancedSelectInputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import { useAddNewMovieModalContent } from './useAddNewMovie';
import styles from './AddNewMovieModalContent.css';

interface AddNewMovieModalContentProps {
  foreignId: string;
  title: string;
  images: Image[];
  onModalClose: () => void;
}

function AddNewMovieModalContent({
  foreignId,
  title,
  images,
  onModalClose,
}: AddNewMovieModalContentProps) {
  const {
    isAdding,
    isSmallScreen,
    isWindows,
    safeForWorkMode,
    settings,
    onInputChange,
    onAddMoviePress,
  } = useAddNewMovieModalContent(foreignId);

  const {
    rootFolderPath,
    monitored,
    moviesMonitored,
    qualityProfileId,
    searchForMovie,
    tags,
  } = settings;

  const onQualityProfileIdChange = React.useCallback(
    ({ value }: EnhancedSelectInputChanged<string | number>) => {
      onInputChange({ name: 'qualityProfileId', value: Number(value) });
    },
    [onInputChange]
  );

  const onAddMoviePressHandler = React.useCallback(() => {
    onAddMoviePress();
  }, [onAddMoviePress]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{title}</ModalHeader>

      <ModalBody>
        <div className={styles.container}>
          {isSmallScreen ? null : (
            <div className={styles.poster}>
              <MoviePoster
                safeForWorkMode={safeForWorkMode}
                className={styles.poster}
                images={images}
                size={250}
                overflow={true}
                lazy={true}
              />
            </div>
          )}

          <div className={styles.info}>
            <Form>
              <FormGroup>
                <FormLabel>{translate('RootFolder')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.ROOT_FOLDER_SELECT}
                  name="rootFolderPath"
                  valueOptions={{
                    isWindows,
                  }}
                  selectedValueOptions={{
                    isWindows,
                  }}
                  errors={rootFolderPath.errors}
                  {...rootFolderPath}
                  onChange={onInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('MonitoredScene')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="monitored"
                  helpText={translate('MonitoredMovieHelpText')}
                  errors={monitored.errors}
                  {...monitored}
                  onChange={onInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('MonitoredMovie')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="moviesMonitored"
                  helpText={translate('MonitoredMovieMovieHelpText')}
                  errors={moviesMonitored.errors}
                  {...moviesMonitored}
                  onChange={onInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('QualityProfile')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.QUALITY_PROFILE_SELECT}
                  name="qualityProfileId"
                  errors={qualityProfileId.errors}
                  {...qualityProfileId}
                  onChange={onQualityProfileIdChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('Tags')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.TAG}
                  name="tags"
                  errors={tags.errors}
                  {...tags}
                  onChange={onInputChange}
                />
              </FormGroup>
            </Form>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className={styles.modalFooter}>
        <label className={styles.searchForMissingMovieLabelContainer}>
          <span className={styles.searchForMissingMovieLabel}>
            {translate('SearchOnAddMovieHelpText')}
          </span>

          <CheckInput
            containerClassName={styles.searchForMissingMovieContainer}
            className={styles.searchForMissingMovieInput}
            name="searchForMovie"
            onChange={onInputChange}
            {...searchForMovie}
          />
        </label>

        <SpinnerButton
          className={styles.addButton}
          kind={kinds.SUCCESS}
          isSpinning={isAdding}
          onPress={onAddMoviePressHandler}
        >
          {translate('AddMovie')}
        </SpinnerButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddNewMovieModalContent;
