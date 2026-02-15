import _ from 'lodash';
import React, { useMemo } from 'react';
import MovieCredit from 'typings/MovieCredit';
import MovieCreditPosters from '../MovieCreditPosters';
import MovieCastPoster from './MovieCastPoster';

interface Props {
  credits: MovieCredit[];
  isSmallScreen: boolean;
}

/**
 * Displays cast posters for a movie
 * Filters and sorts credits to show only cast members
 */
function MovieCastPosters({ credits, isSmallScreen }: Props) {
  const castCredits = useMemo(() => {
    const cast = credits.filter(({ type }) => type === 'cast');
    const sortedCast = cast.sort((a, b) => a.order - b.order);
    return _.uniqBy(sortedCast, 'personName');
  }, [credits]);

  return (
    <MovieCreditPosters
      items={castCredits}
      itemComponent={MovieCastPoster}
      isSmallScreen={isSmallScreen}
    />
  );
}

export default MovieCastPosters;
