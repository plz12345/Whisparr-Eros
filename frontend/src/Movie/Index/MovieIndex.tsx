import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SelectProvider } from 'App/SelectContext';
import { RSS_SYNC } from 'Commands/commandNames';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageJumpBar, { PageJumpBarItems } from 'Components/Page/PageJumpBar';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import TablePager from 'Components/Table/TablePager';
import withScrollPosition from 'Components/withScrollPosition';
import { align, icons, sortDirections } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import NoMovie from 'Movie/NoMovie';
import { executeCommand } from 'Store/Actions/commandActions';
import { fetchQueueDetails } from 'Store/Actions/queueActions';
import scrollPositions from 'Store/scrollPositions';
import createCommandExecutingSelector from 'Store/Selectors/createCommandExecutingSelector';
import createDimensionsSelector from 'Store/Selectors/createDimensionsSelector';
import translate from 'Utilities/String/translate';
import MovieIndexFilterMenu from './Menus/MovieIndexFilterMenu';
import MovieIndexSortMenu from './Menus/MovieIndexSortMenu';
import MovieIndexViewMenu from './Menus/MovieIndexViewMenu';
import MovieIndexRefreshMovieButton from './MovieIndexRefreshMovieButton';
import MovieIndexSearchButton from './MovieIndexSearchButton';
import MovieIndexSearchMenuItem from './MovieIndexSearchMenuItem';
import MovieIndexOverviews from './Overview/MovieIndexOverviews';
import MovieIndexOverviewOptionsModal from './Overview/Options/MovieIndexOverviewOptionsModal';
import MovieIndexPosters from './Posters/MovieIndexPosters';
import MovieIndexPosterOptionsModal from './Posters/Options/MovieIndexPosterOptionsModal';
import MovieIndexSelectAllButton from './Select/MovieIndexSelectAllButton';
import MovieIndexSelectAllMenuItem from './Select/MovieIndexSelectAllMenuItem';
import MovieIndexSelectFooter from './Select/MovieIndexSelectFooter';
import MovieIndexSelectModeButton from './Select/MovieIndexSelectModeButton';
import MovieIndexSelectModeMenuItem from './Select/MovieIndexSelectModeMenuItem';
import MovieIndexTable from './Table/MovieIndexTable';
import MovieIndexTableOptions from './Table/MovieIndexTableOptions';
import { useMovieIndex } from './useMovieIndex';
import styles from './MovieIndex.css';

function getViewComponent(view: string) {
  if (view === 'posters') {
    return MovieIndexPosters;
  }

  if (view === 'overview') {
    return MovieIndexOverviews;
  }

  return MovieIndexTable;
}

interface MovieIndexProps {
  initialScrollTop?: number;
}

const MovieIndex = withScrollPosition((props: MovieIndexProps) => {
  const {
    items,
    totalItems,
    page,
    totalPages,
    sortKey,
    sortDirection,
    columns,
    customFilters,
    filters,
    isFetching,
    isOptionsModalOpen,
    isSelectMode,
    jumpToCharacter,
    scrollerRef,
    selectedFilterKey,
    view,
    handleFirstPagePress,
    handlePreviousPagePress,
    handleNextPagePress,
    handleLastPagePress,
    handlePageSelect,
    handleSortPress,
    onFilterSelect,
    onOptionsModalClose,
    onOptionsPress,
    onSelectModePress,
    onTableOptionChange,
    onViewSelect,
    setJumpToCharacter,
  } = useMovieIndex();

  const isRssSyncExecuting = useSelector(
    createCommandExecutingSelector(RSS_SYNC)
  );
  const { isSmallScreen } = useSelector(createDimensionsSelector());
  const dispatch = useDispatch();
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);

  useEffect(() => {
    dispatch(fetchQueueDetails({ all: true }));
  }, [dispatch]);

  const onRssSyncPress = useCallback(() => {
    dispatch(
      executeCommand({
        name: RSS_SYNC,
      })
    );
  }, [dispatch]);

  const onInteractiveImportPress = useCallback(() => {
    setIsInteractiveImportModalOpen(true);
  }, [setIsInteractiveImportModalOpen]);

  const onInteractiveImportModalClose = useCallback(() => {
    setIsInteractiveImportModalOpen(false);
  }, [setIsInteractiveImportModalOpen]);

  const onJumpBarItemPress = useCallback(
    (character: string) => {
      setJumpToCharacter(character);
    },
    [setJumpToCharacter]
  );

  const onScroll = useCallback(
    ({ scrollTop }: { scrollTop: number }) => {
      setJumpToCharacter(undefined);
      scrollPositions.movieIndex = scrollTop;
    },
    [setJumpToCharacter]
  );

  const jumpBarItems: PageJumpBarItems = useMemo(() => {
    // Reset if not sorting by sortTitle
    if (sortKey !== 'sortTitle') {
      return {
        characters: {},
        order: [],
      };
    }

    const characters = items.reduce((acc: Record<string, number>, item) => {
      let char = item.sortTitle.charAt(0);

      if (!isNaN(Number(char))) {
        char = '#';
      }

      if (char in acc) {
        acc[char] = acc[char] + 1;
      } else {
        acc[char] = 1;
      }

      return acc;
    }, {});

    const order = Object.keys(characters).sort();

    // Reverse if sorting descending
    if (sortDirection === sortDirections.DESCENDING) {
      order.reverse();
    }

    return {
      characters,
      order,
    };
  }, [items, sortKey, sortDirection]);
  const ViewComponent = useMemo(() => getViewComponent(view), [view]);

  const isLoaded = !isFetching || items.length > 0;
  const hasNoMovie = !totalItems;

  return (
    <SelectProvider items={items}>
      <PageContent>
        <PageToolbar>
          <PageToolbarSection>
            <MovieIndexRefreshMovieButton
              isSelectMode={isSelectMode}
              selectedFilterKey={selectedFilterKey}
              items={items}
              totalItems={totalItems}
            />

            <PageToolbarButton
              label={translate('RssSync')}
              iconName={icons.RSS}
              isSpinning={isRssSyncExecuting}
              isDisabled={hasNoMovie}
              onPress={onRssSyncPress}
            />

            <PageToolbarSeparator />

            <MovieIndexSearchButton
              isSelectMode={isSelectMode}
              selectedFilterKey={selectedFilterKey}
              items={items}
              overflowComponent={MovieIndexSearchMenuItem}
            />

            <PageToolbarButton
              label={translate('ManualImport')}
              iconName={icons.INTERACTIVE}
              isDisabled={hasNoMovie}
              onPress={onInteractiveImportPress}
            />

            <PageToolbarSeparator />

            <MovieIndexSelectModeButton
              label={
                isSelectMode
                  ? translate('StopSelecting')
                  : translate('EditMovies')
              }
              iconName={isSelectMode ? icons.SERIES_ENDED : icons.EDIT}
              isSelectMode={isSelectMode}
              overflowComponent={MovieIndexSelectModeMenuItem}
              onPress={onSelectModePress}
            />

            <MovieIndexSelectAllButton
              label={translate('SelectAll')}
              isSelectMode={isSelectMode}
              overflowComponent={MovieIndexSelectAllMenuItem}
            />
          </PageToolbarSection>

          <PageToolbarSection
            alignContent={align.RIGHT}
            collapseButtons={false}
          >
            {view === 'table' ? (
              <TableOptionsModalWrapper
                columns={columns}
                optionsComponent={MovieIndexTableOptions}
                onTableOptionChange={onTableOptionChange}
              >
                <PageToolbarButton
                  label={translate('Options')}
                  iconName={icons.TABLE}
                />
              </TableOptionsModalWrapper>
            ) : (
              <PageToolbarButton
                label={translate('Options')}
                iconName={view === 'posters' ? icons.POSTER : icons.OVERVIEW}
                isDisabled={hasNoMovie}
                onPress={onOptionsPress}
              />
            )}

            <PageToolbarSeparator />

            <MovieIndexViewMenu
              view={view}
              isDisabled={hasNoMovie}
              onViewSelect={onViewSelect}
            />

            <MovieIndexSortMenu
              sortKey={sortKey}
              sortDirection={sortDirection}
              isDisabled={false}
              onSortSelect={handleSortPress}
            />

            <MovieIndexFilterMenu
              selectedFilterKey={selectedFilterKey}
              filters={filters}
              customFilters={customFilters}
              isDisabled={false}
              onFilterSelect={onFilterSelect}
            />
          </PageToolbarSection>
        </PageToolbar>
        <div className={styles.pageContentBodyWrapper}>
          <PageContentBody
            ref={scrollerRef}
            className={styles.contentBody}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            innerClassName={styles[`${view}InnerContentBody`]}
            initialScrollTop={props.initialScrollTop}
            onScroll={onScroll}
          >
            {isFetching && totalItems === 0 ? <LoadingIndicator /> : null}

            {isLoaded && items.length > 0 ? (
              <div
                className={
                  view === 'table' ? undefined : styles.contentBodyContainer
                }
              >
                <ViewComponent
                  scrollerRef={scrollerRef}
                  items={items}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  jumpToCharacter={jumpToCharacter}
                  isSelectMode={isSelectMode}
                  isSmallScreen={isSmallScreen}
                />
                {totalPages > 1 ? (
                  <TablePager
                    page={page}
                    totalRecords={totalItems}
                    totalPages={totalPages}
                    isFetching={isFetching}
                    onFirstPagePress={handleFirstPagePress}
                    onPreviousPagePress={handlePreviousPagePress}
                    onNextPagePress={handleNextPagePress}
                    onLastPagePress={handleLastPagePress}
                    onPageSelect={handlePageSelect}
                  />
                ) : null}
              </div>
            ) : null}

            {!isFetching && items.length === 0 ? (
              <NoMovie totalItems={totalItems} />
            ) : null}
          </PageContentBody>

          {isLoaded && !!jumpBarItems.order.length ? (
            <PageJumpBar
              items={jumpBarItems}
              onItemPress={onJumpBarItemPress}
            />
          ) : null}
        </div>

        {isSelectMode ? <MovieIndexSelectFooter /> : null}

        <InteractiveImportModal
          isOpen={isInteractiveImportModalOpen}
          onModalClose={onInteractiveImportModalClose}
        />

        {view === 'posters' ? (
          <MovieIndexPosterOptionsModal
            isOpen={isOptionsModalOpen}
            onModalClose={onOptionsModalClose}
          />
        ) : null}
        {view === 'overview' ? (
          <MovieIndexOverviewOptionsModal
            isOpen={isOptionsModalOpen}
            onModalClose={onOptionsModalClose}
          />
        ) : null}
      </PageContent>
    </SelectProvider>
  );
}, 'movieIndex');

export default MovieIndex;
