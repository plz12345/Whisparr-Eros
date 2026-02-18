import React, { useEffect, useState } from 'react';
import Icon from 'Components/Icon';
import Label from 'Components/Label';
import Link from 'Components/Link/Link';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, sizes, tooltipPositions } from 'Helpers/Props';
import MovieDetailsLinks from 'Movie/Details/MovieDetailsLinks';
import Movie from 'Movie/Movie';
import MoviePoster from 'Movie/MoviePoster';
import translate from 'Utilities/String/translate';
import AddNewMovieModal from './AddNewMovieModal';
import { useAddNewMovieSearchResult } from './useAddNewMovie';
import styles from './AddNewMovieSearchResult.css';

interface AddNewMovieSearchResultProps {
  movie: Movie;
  isExistingMovie: boolean;
}

function AddNewMovieSearchResult({
  movie,
  isExistingMovie,
  onMovieAdded,
}: AddNewMovieSearchResultProps & { onMovieAdded: () => void }) {
  const { foreignId, tmdbId, tpdbId, images } = movie;
  const { isSmallScreen, safeForWorkMode } = useAddNewMovieSearchResult();
  const [isNewAddMovieModalOpen, setIsNewAddMovieModalOpen] = useState(false);

  useEffect(() => {
    if (isExistingMovie) {
      setIsNewAddMovieModalOpen(false);
    }
  }, [isExistingMovie]);

  function onPress() {
    setIsNewAddMovieModalOpen(true);
  }

  function onAddMovieModalClose() {
    setIsNewAddMovieModalOpen(false);
  }

  const linkProps = isExistingMovie
    ? { to: `/movie/${movie.id}` }
    : { onPress };

  console.log('AddNewMovieSearchResult: ', { movie, isExistingMovie });
  return (
    <div className={styles.searchResult}>
      <Link className={styles.underlay} {...linkProps} />
      <div className={styles.overlay}>
        {isSmallScreen ? null : (
          <div>
            <div className={styles.posterContainer}>
              <MoviePoster
                safeForWorkMode={safeForWorkMode}
                className={styles.poster}
                images={images}
                size={250}
                overflow={true}
                lazy={true}
              />
            </div>
          </div>
        )}
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <div className={styles.titleContainer}>
              <div className={styles.title}>{movie.title}</div>
            </div>
            <div className={styles.icons}>
              {isExistingMovie && (
                <Icon
                  className={styles.alreadyExistsIcon}
                  name={icons.CHECK_CIRCLE}
                  size={36}
                  title={translate('AlreadyInYourLibrary')}
                />
              )}
            </div>
          </div>
          <div>
            <Label size={sizes.LARGE} kind={kinds.QUEUE}>
              {translate('Movie')}
            </Label>
            <Tooltip
              anchor={
                <Label size={sizes.LARGE}>
                  <Icon name={icons.EXTERNAL_LINK} size={13} />
                  <span className={styles.links}>Links</span>
                </Label>
              }
              tooltip={
                <MovieDetailsLinks
                  stashId={foreignId}
                  tmdbId={tmdbId}
                  tpdbId={tpdbId}
                />
              }
              canFlip={true}
              kind={kinds.INVERSE}
              position={tooltipPositions.BOTTOM}
            />
          </div>
        </div>
      </div>
      <AddNewMovieModal
        isOpen={isNewAddMovieModalOpen && !isExistingMovie}
        foreignId={foreignId}
        title={movie.title}
        images={images || []}
        onModalClose={onAddMovieModalClose}
        onMovieAdded={onMovieAdded}
      />
    </div>
  );
}

export default AddNewMovieSearchResult;
