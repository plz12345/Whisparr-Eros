import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ModelBase from 'App/ModelBase';
import { SelectProvider } from 'App/SelectContext';
import { SafeForWorkModeContext } from 'App/State/SafeForWorkContext';
import { RSS_SYNC } from 'Commands/commandNames';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
// removed duplicate import
import PageJumpBar, {
  type PageJumpBarItems,
} from 'Components/Page/PageJumpBar';
// removed duplicate import
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import TableOptionsModalWrapper from 'Components/Table/TableOptions/TableOptionsModalWrapper';
import TablePager from 'Components/Table/TablePager';
import withScrollPosition from 'Components/withScrollPosition';
import { align, icons } from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import MovieIndexSelectAllButton from 'Movie/Index/Select/MovieIndexSelectAllButton';
import MovieIndexSelectAllMenuItem from 'Movie/Index/Select/MovieIndexSelectAllMenuItem';
import MovieIndexSelectModeButton from 'Movie/Index/Select/MovieIndexSelectModeButton';
import MovieIndexSelectModeMenuItem from 'Movie/Index/Select/MovieIndexSelectModeMenuItem';
import Movie from 'Movie/Movie';
import ParseToolbarButton from 'Parse/ParseToolbarButton';
import NoScene from 'Scene/NoScene';
import { executeCommand } from 'Store/Actions/commandActions';
import scrollPositions from 'Store/scrollPositions';
import createCommandExecutingSelector from 'Store/Selectors/createCommandExecutingSelector';
import createDimensionsSelector from 'Store/Selectors/createDimensionsSelector';
import translate from 'Utilities/String/translate';
import SceneIndexFilterMenu from './Menus/SceneIndexFilterMenu';
import SceneIndexSortMenu from './Menus/SceneIndexSortMenu';
import SceneIndexViewMenu from './Menus/SceneIndexViewMenu';
import SceneIndexOverviewOptionsModal from './Overview/Options/SceneIndexOverviewOptionsModal';
import SceneIndexOverviews from './Overview/SceneIndexOverviews';
import SceneIndexPosterOptionsModal from './Posters/Options/SceneIndexPosterOptionsModal';
import SceneIndexPosters from './Posters/SceneIndexPosters';
import SceneIndexRefreshSceneButton from './SceneIndexRefreshSceneButton';
import SceneIndexSearchButton from './SceneIndexSearchButton';
import SceneIndexSelectFooter from './Select/SceneIndexSelectFooter';
import SceneIndexTable from './Table/SceneIndexTable';
import SceneIndexTableOptions from './Table/SceneIndexTableOptions';
import { useSceneIndex } from './useSceneIndex';
import styles from './SceneIndex.css';

function getViewComponent(view: string) {
  if (view === 'posters') {
    return SceneIndexPosters;
  }
  if (view === 'overview') {
    return SceneIndexOverviews;
  }
  return SceneIndexTable;
}

interface SceneIndexProps {
  initialScrollTop?: number;
}

const SceneIndex = withScrollPosition((props: SceneIndexProps) => {
  const {
    items,
    totalItems,
    sortKey,
    sortDirection,
    columns,
    customFilters,
    filters,
    isOptionsModalOpen,
    isSelectMode,
    jumpToCharacter,
    scrollerRef,
    selectedFilterKey,
    view,
    handleSortPress,
    onFilterSelect,
    onOptionsModalClose,
    onOptionsPress,
    onSelectModePress,
    onTableOptionChange,
    onViewSelect,
    setJumpToCharacter,
    page,
    totalPages,
    isFetching,
    handleFirstPagePress,
    handlePreviousPagePress,
    handleNextPagePress,
    handleLastPagePress,
    handlePageSelect,
  } = useSceneIndex();

  const safeForWorkMode = useContext(SafeForWorkModeContext);
  const isRssSyncExecuting = useSelector(
    createCommandExecutingSelector(RSS_SYNC)
  );
  const { isSmallScreen } = useSelector(createDimensionsSelector());
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);

  const onRssSyncPress = useCallback(() => {
    // Use Redux thunk for command
    const dispatch = useDispatch();
    dispatch(
      executeCommand({
        name: RSS_SYNC,
      })
    );
  }, []);

  const onInteractiveImportPress = useCallback(() => {
    setIsInteractiveImportModalOpen(true);
  }, []);

  const onInteractiveImportModalClose = useCallback(() => {
    setIsInteractiveImportModalOpen(false);
  }, []);

  const onJumpBarItemPress = useCallback(
    (character: string) => {
      setJumpToCharacter(character);
    },
    [setJumpToCharacter]
  );

  const onScroll = useCallback(
    ({ scrollTop }: { scrollTop: number }) => {
      setJumpToCharacter(undefined);
      scrollPositions.sceneIndex = scrollTop;
    },
    [setJumpToCharacter]
  );

  const jumpBarItems: PageJumpBarItems = useMemo(() => {
    if (sortKey !== 'sortTitle') {
      return { characters: {}, order: [] };
    }
    type Acc = { characters: Record<string, number>; order: string[] };
    return (items as (ModelBase & { sortTitle?: string })[]).reduce(
      (acc: Acc, item) => {
        let char = item.sortTitle?.charAt(0) || '';
        if (!isNaN(Number(char))) char = '#';
        acc.characters[char] = (acc.characters[char] || 0) + 1;
        if (!acc.order.includes(char)) acc.order.push(char);
        return acc;
      },
      { characters: {}, order: [] }
    );
  }, [items, sortKey]);

  const ViewComponent = useMemo(() => getViewComponent(view), [view]);
  const isLoaded = items.length > 0;
  const hasNoScene = !totalItems;

  return (
    <SelectProvider items={items as Movie[]}>
      <PageContent>
        <PageToolbar>
          <PageToolbarSection>
            <SceneIndexRefreshSceneButton
              isSelectMode={isSelectMode}
              selectedFilterKey={selectedFilterKey}
            />
            <PageToolbarButton
              label={translate('RssSync')}
              iconName={icons.RSS}
              isSpinning={isRssSyncExecuting}
              isDisabled={hasNoScene}
              onPress={onRssSyncPress}
            />

            <PageToolbarSeparator />

            <SceneIndexSearchButton
              isSelectMode={isSelectMode}
              selectedFilterKey={selectedFilterKey}
            />

            <PageToolbarButton
              label={translate('ManualImport')}
              iconName={icons.INTERACTIVE}
              isDisabled={hasNoScene}
              onPress={onInteractiveImportPress}
            />

            <PageToolbarSeparator />
            <ParseToolbarButton />
            <PageToolbarSeparator />

            <MovieIndexSelectModeButton
              label={
                isSelectMode
                  ? translate('StopSelecting')
                  : translate('EditScenes')
              }
              iconName={isSelectMode ? icons.SERIES_ENDED : icons.EDIT}
              isSelectMode={isSelectMode}
              overflowComponent={MovieIndexSelectModeMenuItem}
              onPress={onSelectModePress}
            />

            <MovieIndexSelectAllButton
              label="SelectAll"
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
                optionsComponent={SceneIndexTableOptions}
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
                isDisabled={hasNoScene}
                onPress={onOptionsPress}
              />
            )}

            <PageToolbarSeparator />

            <SceneIndexViewMenu
              view={view}
              isDisabled={hasNoScene}
              onViewSelect={onViewSelect}
            />

            <SceneIndexSortMenu
              sortKey={sortKey}
              sortDirection={sortDirection}
              isDisabled={hasNoScene}
              onSortSelect={handleSortPress}
            />

            <SceneIndexFilterMenu
              selectedFilterKey={selectedFilterKey}
              filters={filters}
              customFilters={customFilters}
              isDisabled={hasNoScene}
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

            {isLoaded ? (
              <div
                className={
                  view === 'table' ? undefined : styles.contentBodyContainer
                }
              >
                <ViewComponent
                  scrollerRef={scrollerRef}
                  items={items as Movie[]}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  jumpToCharacter={jumpToCharacter}
                  isSelectMode={isSelectMode}
                  isSmallScreen={isSmallScreen}
                  safeForWorkMode={safeForWorkMode}
                />
              </div>
            ) : null}

            {/* Always show TablePager if more than one page is needed, regardless of view */}
            {(() => {
              console.log('TablePager props', {
                page,
                totalPages,
                totalItems,
                isFetching,
              });
              return null;
            })()}
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

            {!isFetching && items.length === 0 ? (
              <NoScene totalItems={totalItems} />
            ) : null}
          </PageContentBody>

          {isLoaded && !!jumpBarItems.order.length ? (
            <PageJumpBar
              items={jumpBarItems as PageJumpBarItems}
              onItemPress={onJumpBarItemPress}
            />
          ) : null}
        </div>

        {isSelectMode ? <SceneIndexSelectFooter /> : null}

        <InteractiveImportModal
          isOpen={isInteractiveImportModalOpen}
          onModalClose={onInteractiveImportModalClose}
        />

        {view === 'posters' ? (
          <SceneIndexPosterOptionsModal
            isOpen={isOptionsModalOpen}
            onModalClose={onOptionsModalClose}
          />
        ) : null}
        {view === 'overview' ? (
          <SceneIndexOverviewOptionsModal
            isOpen={isOptionsModalOpen}
            onModalClose={onOptionsModalClose}
          />
        ) : null}
      </PageContent>
    </SelectProvider>
  );
}, 'sceneIndex');

export default SceneIndex;
