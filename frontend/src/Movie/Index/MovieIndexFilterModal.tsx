import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import AppState from 'App/State/AppState';
import FilterModal from 'Components/Filter/FilterModal';
import { setMovieFilter } from 'Store/Actions/movieIndexActions';

function createFilterBuilderPropsSelector() {
  return createSelector(
    (state: AppState) => state.movieIndex.filterBuilderProps,
    (filterBuilderProps) => {
      return filterBuilderProps;
    }
  );
}

interface MovieIndexFilterModalProps {
  isOpen: boolean;
}

export default function MovieIndexFilterModal(
  props: MovieIndexFilterModalProps
) {
  const filterBuilderProps = useSelector(createFilterBuilderPropsSelector());
  const customFilterType = 'movieIndex';

  const dispatch = useDispatch();

  const dispatchSetFilter = useCallback(
    (payload: unknown) => {
      dispatch(setMovieFilter(payload));
    },
    [dispatch]
  );

  return (
    <FilterModal
      {...props}
      sectionItems={[]}
      filterBuilderProps={filterBuilderProps}
      customFilterType={customFilterType}
      dispatchSetFilter={dispatchSetFilter}
    />
  );
}
