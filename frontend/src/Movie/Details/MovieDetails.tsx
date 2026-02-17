// Handler for MonitorToggleButton to match expected signature
import React from 'react';
import { useParams } from 'react-router-dom';
import TextTruncate from 'react-text-truncate';
import { SafeForWorkModeContext } from 'App/State/SafeForWorkContext';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Icon from 'Components/Icon';
import InfoLabel from 'Components/InfoLabel';
import Marquee from 'Components/Marquee';
import Measure from 'Components/Measure';
import MonitorToggleButton from 'Components/MonitorToggleButton';
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
import {
  Image as MovieImageType,
  Statistics as MovieStatistics,
} from 'Movie/Movie';
import MovieCollectionLabel from 'Movie/MovieCollectionLabel';
import MovieGenres from 'Movie/MovieGenres';
import MovieImage from 'Movie/MovieImage';
import MovieInteractiveSearchModal from 'Movie/Search/MovieInteractiveSearchModal';
import MovieFileEditorTable from 'MovieFile/Editor/MovieFileEditorTable';
import ExtraFileTable from 'MovieFile/Extras/ExtraFileTable';
import OrganizePreviewModal from 'Organize/OrganizePreviewModal';
import QualityProfileName from 'Settings/Profiles/Quality/QualityProfileName';
import fonts from 'Styles/Variables/fonts';
// import MovieCollection from 'typings/MovieCollection';
import formatRuntime from 'Utilities/Date/formatRuntime';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import MovieCastPostersConnector from './Credits/Cast/MovieCastPostersConnector';
import MovieDetailsLinks from './MovieDetailsLinks';
import MovieStatusLabel from './MovieStatusLabel';
import MovieStudioLink from './MovieStudioLink';
import MovieTagsConnector from './MovieTagsConnector';
import ReleaseDateDisplay from './ReleaseDateDisplay';
import MovieTitlesTable from './Titles/MovieTitlesTable';
import { useMovieDetails } from './useMovieDetails';
import styles from './MovieDetails.css';

// InfoLabel is a JS component; types provided via declaration file

const defaultFontSize = Number(fonts.defaultFontSize as string);
const lineHeight = parseFloat(fonts.lineHeight as string);

function getFanartUrl(images: MovieImageType[]) {
  const image = images.find((img) => img.coverType === 'fanart');
  return image?.url ?? image?.remoteUrl;
}

function MovieDetails() {
  // Get id from URL params
  const { foreignId: urlId } = useParams<{ foreignId: string }>();

  const safeForWorkMode = React.useContext(SafeForWorkModeContext);
  const {
    movie,
    onRefreshPress,
    onSearchPress,
    isOrganizeModalOpen,
    isEditMovieModalOpen,
    isDeleteMovieModalOpen,
    isInteractiveImportModalOpen,
    isInteractiveSearchModalOpen,
    isMovieHistoryModalOpen,
    overviewHeight,
    titleWidth,
    onOrganizePress,
    onOrganizeModalClose,
    onInteractiveImportPress,
    onInteractiveImportModalClose,
    onEditMoviePress,
    onEditMovieModalClose,
    onInteractiveSearchPress,
    onInteractiveSearchModalClose,
    onDeleteMoviePress,
    onDeleteMovieModalClose,
    onMovieHistoryPress,
    onMovieHistoryModalClose,
    onMeasure,
    onTitleMeasure,
    onMonitorTogglePress,
    isSaving,
    isRefreshing,
    isSearching,
    isFetching,
    isSmallScreen,
    movieFilesError,
    extraFilesError,
    movieCreditsError,
    hasMovieFiles,
    queueItem,
    movieRuntimeFormat,
  } = useMovieDetails(urlId);

  if (!urlId) return null;

  // Defensive: don't render until movie is loaded
  if (!movie) return null;

  // Destructure movie fields (avoid redeclaring id)
  const {
    tmdbId,
    tpdbId,
    stashId,
    title,
    code,
    year,
    releaseDate,
    runtime,
    certification,
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
    itemType,
  } = movie;

  // Handler for MonitorToggleButton to match expected signature
  function handleMonitorToggle(
    value: boolean | { monitored: boolean; moviesMonitored: boolean }
  ) {
    if (typeof value === 'boolean') {
      onMonitorTogglePress(value);
    } else if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, 'monitored') &&
      typeof (value as { monitored: boolean }).monitored === 'boolean'
    ) {
      onMonitorTogglePress((value as { monitored: boolean }).monitored);
    }
  }

  const id = movie.id;

  const { sizeOnDisk = 0 } = statistics as MovieStatistics;
  const statusDetails = getMovieStatusDetails(status);
  const fanartUrl = getFanartUrl(images);
  const marqueeWidth = isSmallScreen ? titleWidth : titleWidth - 150;
  const titleWithYear = `${title}${year > 0 ? ` (${year})` : ''}`;

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
            onPress={onInteractiveSearchPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('PreviewRename')}
            iconName={icons.ORGANIZE}
            isDisabled={!hasMovieFiles}
            onPress={onOrganizePress}
          />

          <PageToolbarButton
            label={translate('ManageFiles')}
            iconName={icons.MOVIE_FILE}
            onPress={onInteractiveImportPress}
          />

          <PageToolbarButton
            label={translate('History')}
            iconName={icons.HISTORY}
            onPress={onMovieHistoryPress}
          />

          <PageToolbarSeparator />

          <PageToolbarButton
            label={translate('Edit')}
            iconName={icons.EDIT}
            onPress={onEditMoviePress}
          />

          <PageToolbarButton
            label={translate('Delete')}
            iconName={icons.DELETE}
            onPress={onDeleteMoviePress}
          />
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody innerClassName={styles.innerContentBody}>
        <div
          className={itemType === 'movie' ? styles.header : styles.sceneHeader}
        >
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
              className={
                itemType === 'movie' ? styles.poster : styles.screenshot
              }
              coverType={itemType === 'movie' ? 'poster' : 'screenshot'}
              images={images}
              size={500}
              lazy={false}
              placeholder={posterPlaceholder}
            />

            <div className={styles.info}>
              <Measure onMeasure={onTitleMeasure}>
                <div className={styles.titleRow}>
                  <div className={styles.titleContainer}>
                    <div className={styles.toggleMonitoredContainer}>
                      <MonitorToggleButton
                        className={styles.monitorToggleButton}
                        monitored={monitored}
                        isSaving={isSaving}
                        size={40}
                        onPress={handleMonitorToggle}
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
                  {certification ? (
                    <span
                      className={styles.certification}
                      title={translate('Certification')}
                    >
                      {certification}
                    </span>
                  ) : null}

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
                        tooltip={<MovieTagsConnector key={id} movieId={id} />}
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

                {studioTitle && !isSmallScreen ? (
                  <InfoLabel
                    className={styles.detailsInfoLabel}
                    name={translate('Studio')}
                    size={sizes.LARGE}
                  >
                    <span className={styles.studio}>{studioTitle}</span>
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

              <Measure onMeasure={onMeasure}>
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

        <div className={styles.contentContainer}>
          {!isFetching && movieFilesError ? (
            <Alert kind={kinds.DANGER}>
              {translate('LoadingMovieFilesFailed')}
            </Alert>
          ) : null}

          {!isFetching && extraFilesError ? (
            <Alert kind={kinds.DANGER}>
              {translate('LoadingMovieExtraFilesFailed')}
            </Alert>
          ) : null}

          <FieldSet legend={translate('Files')}>
            <MovieFileEditorTable movieId={id} />
            <ExtraFileTable movieId={id} />
          </FieldSet>

          {!isFetching && movieCreditsError ? (
            <Alert kind={kinds.DANGER}>
              {translate('LoadingMovieCreditsFailed')}
            </Alert>
          ) : null}

          <FieldSet legend={translate('Cast')}>
            <MovieCastPostersConnector
              movieId={id}
              isSmallScreen={isSmallScreen}
            />
          </FieldSet>

          <FieldSet legend={translate('Titles')}>
            <MovieTitlesTable movieId={id} />
          </FieldSet>
        </div>

        <OrganizePreviewModal
          isOpen={isOrganizeModalOpen}
          movieId={id}
          onModalClose={onOrganizeModalClose}
        />

        <EditMovieModal
          isOpen={isEditMovieModalOpen}
          movie={movie}
          onModalClose={onEditMovieModalClose}
          onDeleteMoviePress={onDeleteMoviePress}
        />

        <MovieHistoryModal
          isOpen={isMovieHistoryModalOpen}
          movieId={id}
          onModalClose={onMovieHistoryModalClose}
        />

        <DeleteMovieModal
          isOpen={isDeleteMovieModalOpen}
          movie={movie}
          onModalClose={onDeleteMovieModalClose}
        />

        <InteractiveImportModal
          isOpen={isInteractiveImportModalOpen}
          movieId={id}
          title={title}
          folder={path}
          initialSortKey="relativePath"
          initialSortDirection={sortDirections.ASCENDING}
          showMovie={false}
          allowMovieChange={false}
          showDelete={true}
          showImportMode={false}
          modalTitle={translate('ManageFiles')}
          onModalClose={onInteractiveImportModalClose}
        />

        <MovieInteractiveSearchModal
          isOpen={isInteractiveSearchModalOpen}
          movieId={id}
          onModalClose={onInteractiveSearchModalClose}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default MovieDetails;
