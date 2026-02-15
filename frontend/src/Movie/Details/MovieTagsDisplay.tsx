import React from 'react';
import { useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import Label from 'Components/Label';
import { kinds, sizes } from 'Helpers/Props';
import sortByProp from 'Utilities/Array/sortByProp';

interface MovieTagsDisplayProps {
  tagIds: number[];
}

/**
 * Displays tags for a movie by mapping tag IDs to tag labels
 * Uses Redux to fetch tag definitions (still needed as tags are global app state)
 */
function MovieTagsDisplay({ tagIds }: MovieTagsDisplayProps) {
  const tagList = useSelector((state: AppState) => state.tags.items);

  if (!tagIds || tagIds.length === 0) {
    return null;
  }

  const tags = tagIds
    .map((tagId) => tagList.find((tag) => tag.id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => !!tag)
    .sort(sortByProp('label'));

  return (
    <div>
      {tags.map((tag) => (
        <Label key={tag.id} kind={kinds.INFO} size={sizes.LARGE}>
          {tag.label}
        </Label>
      ))}
    </div>
  );
}

export default MovieTagsDisplay;
