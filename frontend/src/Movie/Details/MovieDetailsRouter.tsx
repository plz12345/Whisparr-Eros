import React from 'react';
import { useParams } from 'react-router-dom';
import NotFound from 'Components/NotFound';
import SceneDetails from '../../Scene/Details/SceneDetails';
import MovieDetails from './MovieDetails';

/**
 * Router component that determines whether to render MovieDetails or SceneDetails
 * based on the foreignId format:
 * - Int (TMDB ID) → MovieDetails
 * - UUID (Stash/TPDB ID) → SceneDetails
 */
function MovieDetailsRouter() {
  const { foreignId } = useParams<{ foreignId: string }>();

  if (!foreignId) {
    return <NotFound message="Movie or scene not found" />;
  }

  // Check if foreignId is an integer (TMDB) or UUID (Stash/TPDB)
  const isMovie = /^\d+$/.test(foreignId);

  if (isMovie) {
    return <MovieDetails foreignId={foreignId} />;
  }
  return <SceneDetails foreignId={foreignId} />;
}

export default MovieDetailsRouter;
