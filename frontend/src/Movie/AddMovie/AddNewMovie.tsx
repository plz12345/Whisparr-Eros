import React from 'react';
import { Error } from 'App/State/AppSectionState';
import Alert from 'Components/Alert';
import TextInput from 'Components/Form/TextInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import Link from 'Components/Link/Link';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { icons, kinds } from 'Helpers/Props';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import AddNewMovieSearchResult from './AddNewMovieSearchResult';
import useAddNewMovie, { MovieWithExistingStatus } from './useAddNewMovie';
import styles from './AddNewMovie.css';

function AddNewMovie() {
  const {
    error,
    isFetching,
    term,
    moviesWithStatus,
    onMovieLookupChange,
    onClearMovieLookupPress,
    invalidateMovieListCache,
  } = useAddNewMovie();

  const handleInputChange = React.useCallback(
    (e: { name: string; value: string }) => {
      onMovieLookupChange(e.value);
    },
    [onMovieLookupChange]
  );

  return (
    <PageContent title={translate('AddNewScene')}>
      <PageContentBody>
        <div className={styles.searchContainer}>
          <div className={styles.searchIconContainer}>
            <Icon name={icons.SEARCH} size={20} />
          </div>

          <TextInput
            className={styles.searchInput}
            name="movieLookup"
            value={term}
            placeholder="e.g. Angela White, https://stashdb.org/Movies/155f2559-d1f1-42b1-8cbe-9008542df5ce"
            autoFocus={true}
            onChange={handleInputChange}
          />

          <Button
            className={styles.clearLookupButton}
            onPress={onClearMovieLookupPress}
          >
            <Icon name={icons.REMOVE} size={20} />
          </Button>
        </div>

        {isFetching && <LoadingIndicator />}

        {!isFetching && !!error ? (
          <div className={styles.message}>
            <div className={styles.helpText}>
              {translate('YouCanAlsoSearchMovie')}
            </div>
            <Alert kind={kinds.WARNING}>
              {getErrorMessage(error as Error)}
            </Alert>
            <div>
              <Link to="https://wiki.servarr.com/whisparr/troubleshooting#invalid-response-received-from-tmdb">
                {translate('WhySearchesCouldBeFailing')}
              </Link>
            </div>
          </div>
        ) : null}

        {!isFetching && !error && !!moviesWithStatus.length && (
          <div className={styles.searchResults}>
            {moviesWithStatus.map((status: MovieWithExistingStatus) => {
              if (status.movie) {
                return (
                  <AddNewMovieSearchResult
                    key={status.movie.foreignId}
                    movie={status.movie}
                    isExistingMovie={status.isExistingMovie}
                    onMovieAdded={invalidateMovieListCache}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {!isFetching && !error && !moviesWithStatus.length && !!term && (
          <div className={styles.message}>
            <div className={styles.noResults}>
              {translate('CouldNotFindResults', { term })}
            </div>
            <div>{translate('YouCanAlsoSearch')}</div>
            <div>
              <Link to="https://wiki.servarr.com/whisparr/faq#why-can-i-not-add-a-new-movie-to-whisparr">
                {translate('CantFindScene')}
              </Link>
            </div>
          </div>
        )}

        {term ? null : (
          <div className={styles.message}>
            <div className={styles.helpText}>
              {translate('AddNewSceneMessage')}
            </div>
            <div>{translate('AddNewStashIdMessage')}</div>
          </div>
        )}

        <div />
      </PageContentBody>
    </PageContent>
  );
}

export default AddNewMovie;
