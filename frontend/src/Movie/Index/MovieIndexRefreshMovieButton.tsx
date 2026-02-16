import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ModelBase from 'App/ModelBase';
import { useSelect } from 'App/SelectContext';
import { REFRESH_MOVIE } from 'Commands/commandNames';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import { icons } from 'Helpers/Props';
import { executeCommand } from 'Store/Actions/commandActions';
import createCommandExecutingSelector from 'Store/Selectors/createCommandExecutingSelector';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';

interface MovieIndexRefreshMovieButtonProps {
  isSelectMode: boolean;
  selectedFilterKey: string;
  items: ModelBase[];
  totalItems: number;
}

function MovieIndexRefreshMovieButton(
  props: MovieIndexRefreshMovieButtonProps
) {
  const isRefreshing = useSelector(
    createCommandExecutingSelector(REFRESH_MOVIE)
  );

  const dispatch = useDispatch();
  const { isSelectMode, selectedFilterKey, items, totalItems } = props;
  const [selectState] = useSelect();
  const { selectedState } = selectState;

  const selectedMovieIds = useMemo(() => {
    return getSelectedIds(selectedState);
  }, [selectedState]);

  const moviesToRefresh =
    isSelectMode && selectedMovieIds.length > 0
      ? selectedMovieIds
      : items.map((m) => m.id);

  const refreshIndexLabel =
    selectedFilterKey === 'all'
      ? translate('UpdateAll')
      : translate('UpdateFiltered');

  const refreshSelectLabel =
    selectedMovieIds.length > 0
      ? translate('UpdateSelected')
      : translate('UpdateAll');

  const onPress = useCallback(() => {
    dispatch(
      executeCommand({
        name: REFRESH_MOVIE,
        movieIds: moviesToRefresh,
      })
    );
  }, [dispatch, moviesToRefresh]);

  return (
    <PageToolbarButton
      label={isSelectMode ? refreshSelectLabel : refreshIndexLabel}
      isSpinning={isRefreshing}
      isDisabled={!totalItems}
      iconName={icons.REFRESH}
      onPress={onPress}
    />
  );
}

export default MovieIndexRefreshMovieButton;
