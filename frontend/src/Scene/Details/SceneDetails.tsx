import React, { useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import TextTruncate from 'react-text-truncate';
import AppState from 'App/State/AppState';
import { SafeForWorkModeContext } from 'App/State/SafeForWorkContext';
import FieldSet from 'Components/FieldSet';
import Icon from 'Components/Icon';
import InfoLabel from 'Components/InfoLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Marquee from 'Components/Marquee';
import Measure from 'Components/Measure';
import MonitorToggleButton from 'Components/MonitorToggleButton';
import NotFound from 'Components/NotFound';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import posterPlaceholder from 'Components/posterPlaceholder';
import TmdbRating from 'Components/TmdbRating';
import Tooltip from 'Components/Tooltip/Tooltip';
import {
  icons,
  kinds,
  sizes,
  sortDirections,
  tooltipPositions,
} from 'Helpers/Props';
import InteractiveImportModal from 'InteractiveImport/InteractiveImportModal';
import DeleteMovieModal from 'Movie/Delete/DeleteMovieModal';
import EditMovieModal from 'Movie/Edit/EditMovieModal';
import getMovieStatusDetails from 'Movie/getMovieStatusDetails';
import MovieHistoryModal from 'Movie/History/MovieHistoryModal';
import { Image as MovieImageType } from 'Movie/Movie';
import MovieCollectionLabel from 'Movie/MovieCollectionLabel';
import MovieGenres from 'Movie/MovieGenres';
import MovieImage from 'Movie/MovieImage';
import MovieInteractiveSearchModal from 'Movie/Search/MovieInteractiveSearchModal';
import ExtraFileTable from 'MovieFile/Extras/ExtraFileTable';
import OrganizePreviewModal from 'Organize/OrganizePreviewModal';
import QualityProfileName from 'Settings/Profiles/Quality/QualityProfileName';
import fonts from 'Styles/Variables/fonts';
import formatRuntime from 'Utilities/Date/formatRuntime';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import MovieDetailsLinks from '../../Movie/Details/MovieDetailsLinks';
import MovieStatusLabel from '../../Movie/Details/MovieStatusLabel';
import MovieStudioLink from '../../Movie/Details/MovieStudioLink';
import MovieTagsDisplay from '../../Movie/Details/MovieTagsDisplay';
import ReleaseDateDisplay from '../../Movie/Details/ReleaseDateDisplay';
import MovieTitlesTable from '../../Movie/Details/Titles/MovieTitlesTable';
import SceneCastPosters from './SceneCastPosters';
import SceneFileEditorTable from './SceneFileEditorTable';
import { useSceneDetails } from './useSceneDetails';
import styles from '../../Movie/Details/MovieDetails.css';

const defaultFontSize = Number(fonts.defaultFontSize as string);
const lineHeight = parseFloat(fonts.lineHeight as string);

function getFanartUrl(images: MovieImageType[]) {
  const image = images.find((img) => img.coverType === 'fanart');
  return image?.url ?? image?.remoteUrl;
}

interface SceneDetailsProps {
  foreignId: string;
}

/**
 * Scene Details Component - displays detailed information for a single scene
 * Uses React Query for data fetching via useSceneDetails hook
 */
function SceneDetails({ foreignId }: SceneDetailsProps) {
  const {
    scene,
    sceneId,
    isSceneDetailsFetching,
    sceneDetailsError,
    onRefreshPress,
    onSearchPress,
    onMonitorTogglePress,
    isManualRefresh,
  } = useSceneDetails(foreignId);

  const safeForWorkMode = useContext(SafeForWorkModeContext);
  const isSmallScreen = useSelector(
    (state: AppState) => state.app.dimensions.isSmallScreen
  );
  const movieRuntimeFormat = useSelector(
    (state: AppState) =>
      state.settings.ui.item.movieRuntimeFormat || 'hoursMinutes'
  );

  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isEditMovieModalOpen, setIsEditMovieModalOpen] = useState(false);
  const [isDeleteMovieModalOpen, setIsDeleteMovieModalOpen] = useState(false);
  const [isInteractiveImportModalOpen, setIsInteractiveImportModalOpen] =
    useState(false);
  const [isInteractiveSearchModalOpen, setIsInteractiveSearchModalOpen] =
    useState(false);
  const [isMovieHistoryModalOpen, setIsMovieHistoryModalOpen] = useState(false);
  const [overviewHeight, setOverviewHeight] = useState(0);
  const [titleWidth, setTitleWidth] = useState(0);

  if (isSceneDetailsFetching && !scene) {
    return (
      <PageContent title={translate('Loading')}>
        <PageContentBody>
          <LoadingIndicator />
        </PageContentBody>
      </PageContent>
    );
  }

  if (sceneDetailsError) {
    return (
      <PageContent title={translate('Error')}>
        <PageContentBody>
          <NotFound message={translate('FailedToLoadSceneFromAPI')} />
        </PageContentBody>
      </PageContent>
    );
  }

  if (!scene) {
    return (
      <PageContent title={translate('NotFound')}>
        <PageContentBody>
          <NotFound message={translate('SceneNotFound')} />
        </PageContentBody>
      </PageContent>
    );
  }

  const {
    title,
    year,
    releaseDate,
    runtime,
    ratings,
    path,
    statistics = {},
    qualityProfileId,
    monitored,
    studioTitle,
    studioForeignId,
    genres = [],
    collection,
    overview,
    website,
    status,
    isAvailable,
    images = [],
    tags = [],
    credits = [],
    tmdbId,
    tpdbId,
    stashId,
    movieFile,
    movieFileId,
    hasFile: hasMovieFiles,
  } = scene;

  // Optional properties not in Movie type but may come from API
  const code = (scene as any).code as string | undefined;
  const studio = (scene as any).studio as string | undefined;

  const { sizeOnDisk = 0 } = statistics as { sizeOnDisk?: number };
  const statusDetails = getMovieStatusDetails(status);
  const fanartUrl = getFanartUrl(images);
  const marqueeWidth = isSmallScreen ? titleWidth : titleWidth - 150;
  const titleWithYear = `${title}${year > 0 ? ` (${year})` : ''}`;

  // TODO: Get actual queue item from Redux or API
  const queueItem = null;

  // TODO: Get these from actual data sources
  const isSaving = false;
  const isRefreshing = isManualRefresh;
  const isSearching = false;

  return (
    <PageContent title={titleWithYear}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('RefreshAndScan')}
            iconName={icons.REFRESH}
            spinningName={icons.REFRESH}
            title={translate('RefreshInformationAndScanDisk')}
            isSpinning={isRefreshing}
            onPress={onRefreshPress}
          />

          <PageToolbarButton
            label={translate('SearchMovie')}
            iconName={icons.SEARCH}
            isSpinning={isSearching}
            title={undefined}
            onPress={onSearchPress}
          />

          <PageToolbarButton
            label={translate('InteractiveSearch')}
            iconName={icons.INTERACTIVE}
            isSpinning={isSearching}
            title={undefined}
            onPress={() => setIsInteractiveSearchModalOpen(true)}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('PreviewRename')}
            iconName={icons.ORGANIZE}
            isDisabled={!hasMovieFiles}
            onPress={() => setIsOrganizeModalOpen(true)}
          />

          <PageToolbarButton
            label={translate('ManageFiles')}
            iconName={icons.MOVIE_FILE}
            onPress={() => setIsInteractiveImportModalOpen(true)}
          />

          <PageToolbarButton
            label={translate('History')}
            iconName={icons.HISTORY}
            onPress={() => setIsMovieHistoryModalOpen(true)}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('Edit')}
            iconName={icons.EDIT}
            onPress={() => setIsEditMovieModalOpen(true)}
          />

          <PageToolbarButton
            label={translate('Delete')}
            iconName={icons.DELETE}
            onPress={() => setIsDeleteMovieModalOpen(true)}
          />
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody innerClassName={styles.innerContentBody}>
        <div className={styles.sceneHeader}>
          <div
            className={styles.backdrop}
            style={
              fanartUrl && !safeForWorkMode
                ? { backgroundImage: `url(${fanartUrl})` }
                : undefined
            }
          >
            <div className={styles.backdropOverlay} />
          </div>

          <div className={styles.headerContent}>
            <MovieImage
              safeForWorkMode={safeForWorkMode}
              className={styles.screenshot}
              coverType="screenshot"
              images={images}
              size={500}
              lazy={false}
              placeholder={posterPlaceholder}
            />

            <div className={styles.info}>
              <Measure
                onMeasure={({ width }: { width: number }) =>
                  setTitleWidth(width)
                }
              >
                <div className={styles.titleRow}>
                  <div className={styles.titleContainer}>
                    <div className={styles.toggleMonitoredContainer}>
                      <MonitorToggleButton
                        className={styles.monitorToggleButton}
                        monitored={monitored}
                        isSaving={isSaving}
                        size={40}
                        type="sceneMonitor"
                        onPress={() => onMonitorTogglePress(!monitored)}
                      />
                    </div>

                    <div
                      className={styles.title}
                      style={{ width: marqueeWidth }}
                    >
                      <Marquee text={title} />
                    </div>
                  </div>
                </div>
              </Measure>

              <div className={styles.details}>
                <div>
                  {releaseDate ? (
                    <ReleaseDateDisplay releaseDate={releaseDate} />
                  ) : null}

                  {studioTitle ? (
                    <span className={styles.studio}>
                      <MovieStudioLink
                        foreignId={studioForeignId}
                        studioTitle={studioTitle}
                      />
                    </span>
                  ) : null}

                  {runtime ? (
                    <span
                      className={styles.runtime}
                      title={translate('Runtime')}
                    >
                      {formatRuntime(runtime, movieRuntimeFormat)}
                    </span>
                  ) : null}

                  <span className={styles.links}>
                    <Tooltip
                      anchor={<Icon name={icons.EXTERNAL_LINK} size={20} />}
                      tooltip={
                        <MovieDetailsLinks
                          tmdbId={tmdbId}
                          tpdbId={tpdbId}
                          stashId={stashId ?? undefined}
                          website={website}
                        />
                      }
                      position={tooltipPositions.BOTTOM}
                    />
                  </span>

                  {!!tags.length && (
                    <span>
                      <Tooltip
                        anchor={<Icon name={icons.TAGS} size={20} />}
                        tooltip={<MovieTagsDisplay tagIds={tags} />}
                        position={tooltipPositions.BOTTOM}
                      />
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.details}>
                {!!ratings.tmdb && (
                  <span className={styles.rating}>
                    <TmdbRating ratings={ratings} iconSize={20} />
                  </span>
                )}
              </div>

              <div className={styles.detailsInfoLabelContainer}>
                <InfoLabel
                  className={styles.detailsInfoLabel}
                  name={translate('Path')}
                  size={sizes.LARGE}
                >
                  <span className={styles.path}>{path}</span>
                </InfoLabel>

                <InfoLabel
                  className={styles.detailsInfoLabel}
                  name={translate('Status')}
                  title={statusDetails.message}
                  kind={kinds.DELETE}
                  size={sizes.LARGE}
                >
                  <span className={styles.statusName}>
                    <MovieStatusLabel
                      status={status}
                      hasMovieFiles={hasMovieFiles}
                      monitored={monitored}
                      isAvailable={isAvailable}
                      queueItem={queueItem}
                    />
                  </span>
                </InfoLabel>

                <InfoLabel
                  className={styles.detailsInfoLabel}
                  name={translate('QualityProfile')}
                  size={sizes.LARGE}
                >
                  <span className={styles.qualityProfileName}>
                    <QualityProfileName qualityProfileId={qualityProfileId} />
                  </span>
                </InfoLabel>

                <InfoLabel
                  className={styles.detailsInfoLabel}
                  name={translate('Size')}
                  size={sizes.LARGE}
                >
                  <span className={styles.sizeOnDisk}>
                    {formatBytes(sizeOnDisk)}
                  </span>
                </InfoLabel>

                {collection ? (
                  <InfoLabel
                    className={styles.detailsInfoLabel}
                    name={translate('Collection')}
                    size={sizes.LARGE}
                  >
                    <div className={styles.collection}>
                      <MovieCollectionLabel tmdbId={collection.tmdbId} />
                    </div>
                  </InfoLabel>
                ) : null}

                {!!code && !!code.length && (
                  <InfoLabel
                    className={styles.detailsInfoLabel}
                    name={translate('Code')}
                    title={translate('Code')}
                    size={sizes.LARGE}
                  >
                    <span className={styles.code}>{code}</span>
                  </InfoLabel>
                )}

                {studio && !isSmallScreen ? (
                  <InfoLabel
                    className={styles.detailsInfoLabel}
                    name={translate('Studio')}
                    size={sizes.LARGE}
                  >
                    <span className={styles.studio}>{studio}</span>
                  </InfoLabel>
                ) : null}

                {genres.length && !isSmallScreen ? (
                  <InfoLabel
                    className={styles.detailsInfoLabel}
                    name={translate('Genres')}
                    size={sizes.LARGE}
                  >
                    <MovieGenres className={styles.genres} genres={genres} />
                  </InfoLabel>
                ) : null}
              </div>

              <Measure
                onMeasure={({ height }: { height: number }) =>
                  setOverviewHeight(height)
                }
              >
                <div className={styles.overview}>
                  <TextTruncate
                    line={Math.floor(
                      overviewHeight / (defaultFontSize * lineHeight)
                    )}
                    text={overview}
                  />
                </div>
              </Measure>
            </div>
          </div>
        </div>

        {sceneId && (
          <div className={styles.contentContainer}>
            <FieldSet legend={translate('Files')}>
              <SceneFileEditorTable
                sceneId={sceneId}
                movieFileId={movieFileId}
                movieFile={movieFile}
              />
              <ExtraFileTable movieId={sceneId} />
            </FieldSet>

            <FieldSet legend={translate('Cast')}>
              <SceneCastPosters
                credits={credits}
                isSmallScreen={isSmallScreen}
              />
            </FieldSet>

            <FieldSet legend={translate('Titles')}>
              <MovieTitlesTable movieId={sceneId} />
            </FieldSet>
          </div>
        )}

        {sceneId && (
          <>
            <OrganizePreviewModal
              isOpen={isOrganizeModalOpen}
              movieId={sceneId}
              onModalClose={() => setIsOrganizeModalOpen(false)}
            />

            <EditMovieModal
              isOpen={isEditMovieModalOpen}
              movieId={sceneId}
              onModalClose={() => setIsEditMovieModalOpen(false)}
              onDeleteMoviePress={() => {
                setIsEditMovieModalOpen(false);
                setIsDeleteMovieModalOpen(true);
              }}
            />

            <MovieHistoryModal
              isOpen={isMovieHistoryModalOpen}
              movieId={sceneId}
              onModalClose={() => setIsMovieHistoryModalOpen(false)}
            />

            <DeleteMovieModal
              isOpen={isDeleteMovieModalOpen}
              movieId={sceneId}
              onModalClose={() => setIsDeleteMovieModalOpen(false)}
            />

            <InteractiveImportModal
              isOpen={isInteractiveImportModalOpen}
              movieId={sceneId}
              title={title}
              folder={path}
              initialSortKey="relativePath"
              initialSortDirection={sortDirections.ASCENDING}
              showMovie={false}
              allowMovieChange={false}
              showDelete={true}
              showImportMode={false}
              modalTitle={translate('ManageFiles')}
              onModalClose={() => setIsInteractiveImportModalOpen(false)}
            />

            <MovieInteractiveSearchModal
              isOpen={isInteractiveSearchModalOpen}
              movieId={sceneId}
              onModalClose={() => setIsInteractiveSearchModalOpen(false)}
            />
          </>
        )}
      </PageContentBody>
    </PageContent>
  );
}

export default SceneDetails;
