import React from 'react';
import { useParams } from 'react-router-dom';
import { useSceneDetails } from './useSceneDetails';

export default function SceneDetails() {
  const { foreignId } = useParams<{ foreignId: string }>();
  const { data, isLoading, error } = useSceneDetails(foreignId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading scene details.</div>;
  if (!data) return <div>No scene found.</div>;

  // TODO: Render scene details UI here, similar to MovieDetails
  return (
    <div>
      <h1>{data.title || data.name}</h1>
      {/* Add more fields as needed */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
