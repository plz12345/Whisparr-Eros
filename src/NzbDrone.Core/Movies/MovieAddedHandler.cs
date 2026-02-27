using System.Collections.Generic;
using System.Linq;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Movies.Commands;
using NzbDrone.Core.Movies.Events;

namespace NzbDrone.Core.Movies
{
    public class MovieAddedHandler : IHandle<MovieAddedEvent>, IHandle<MoviesImportedEvent>
    {
        private readonly IManageCommandQueue _commandQueueManager;

        public MovieAddedHandler(IManageCommandQueue commandQueueManager)
        {
            _commandQueueManager = commandQueueManager;
        }

        public void Handle(MovieAddedEvent message)
        {
            _commandQueueManager.Push(new RefreshMovieCommand(new List<int> { message.Movie.Id }, true));
        }

        public void Handle(MoviesImportedEvent message)
        {
            // Revised to pass the list to command queue manager instead of each item, the manager already enumerates
            var ids = message.Movies.Select(m => m.Id).ToList();
            var command = new RefreshMovieCommand(ids, true);

            _commandQueueManager.Push(command);
        }
    }
}
