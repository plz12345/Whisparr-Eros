import _ from 'lodash';
import React, { useMemo } from 'react';
import MovieCredit from 'typings/MovieCredit';
import MovieCastPoster from '../../Movie/Details/Credits/Cast/MovieCastPoster';
import MovieCreditPosters from '../../Movie/Details/Credits/MovieCreditPosters';

interface Props {
  credits: MovieCredit[];
  isSmallScreen: boolean;
}

/**
 * Scene-specific cast posters component
 * Displays cast posters for a scene
 * Separated from MovieCastPosters to allow independent customization
 */
function SceneCastPosters({ credits, isSmallScreen }: Props) {
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

export default SceneCastPosters;
