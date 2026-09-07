# User guide

## Music and playlists

Choose a music library and view: Albums, Recently added, Recently played, Most played, Songs, Artists, Playlists, Favorites, Genres, Radio, or Rediscover. Server pagination supports large catalogs. Track selections apply to the tracks currently shown, as stated in the selection bar.

Open an artist to browse their albums. Open an album to play or select its tracks. Heart buttons update favorites; song star selectors update ratings. Search returns the entity types appropriate to the view.

Create playlists from Playlists → New playlist. Select songs elsewhere and choose Add to playlist. Playlist arrows change server order; remove controls remove entries without deleting files. Duplicates are preserved. Read-only or smart playlists are played here but managed on the server. Playlist deletion requires confirmation.

Radio plays stations configured on Navidrome. Live stations do not have a seekable duration.

## Books and podcasts

Book libraries contain books. Chapters are whole-book markers and can cross physical files. Use Chapters to jump to a position; Audio files exposes the underlying file boundaries. Resume uses the latest Audiobookshelf server position. Speed is saved per book or episode.

Podcast libraries contain shows. Shows contain independently playable episodes, each with its own status, availability, and resume position. Search episode titles, subtitles, descriptions and filenames. Sort by date, title, season, episode number, filename, duration or progress. Filter by status and downloaded availability. List-level playback actions include downloaded matching episodes in the displayed order.

Status filters include Not started, In progress, Unfinished and Finished. Mark finished/unfinished affects the selected book or episode only. Reset asks for confirmation. Changing the actively playing item's status first stops and flushes it so subsequent session updates cannot undo the manual change.

Audiobookshelf library search is relevance-ranked, capped at 100 matches. Clear it to use full-library server sorting and pagination. Continue Listening shows recent book and episode progress; use Refresh progress to obtain changes from other devices.

Book bookmarks are saved on Audiobookshelf. Add a title and position; the default is the active book's playhead or saved book progress. Bookmarks can be played or deleted. Use Listen later for a future date.

## Player and queue

Click the bottom-left cover to open Now Playing. It shows source album/playlist/show context, artwork, format, and the current queue. Move entries with arrows, remove upcoming entries, jump, clear upcoming entries, or stop and clear. Ordinary stop retains the queue. Restart restores it without autoplay.

Shuffle changes the upcoming order and advances through it without randomly revisiting entries. Repeat supports Off, All and One. A multi-file book is one queue entry; repeat-one repeats the book, not one physical file.

Spoken controls skip back 15 seconds and forward 30 seconds. Music resets to 1× speed. Sleep pauses after a selected duration; chapter-end sleep is available from the queue for books.

Keyboard: Space toggles playback outside fields; Ctrl+Right advances; Ctrl+Left goes back; Escape closes expanded Now Playing. Hardware media keys work when registration is available. Optional system tray behavior keeps playback alive after closing the window; use tray Quit to exit and flush progress.

## Local folders

Local Files → Add folder opens a native picker. Browse the actual folder structure. Search affects only the current folder; the app does not recursively scan everything. Audio tags, duration, format, size and embedded cover art are read when supported. Unreadable tags retain the filename, and MPV can still attempt playback.

Remove source only removes the reference; media files are never deleted or modified. Folder links escaping the chosen root are blocked. Unavailable drives and inaccessible folders report errors.

## Plans and history

Listen later defaults to tomorrow and accepts a note. Reschedule, complete, reopen, or remove plans from the sidebar. Completing a plan does not mark server media finished. Plans are device-local bookmarks with dates, not background alarms or notifications.

History stores up to 500 recently played distinct items on this device. It is separate from server listening statistics. Replaying a spoken item uses its current server position.

## Troubleshooting

For updates, open **Settings → App updates**. Check for updates, download the offered stable version, and choose Restart and install when ready. Downloading can run while you listen. Installation stops playback and saves the queue and listening session. Normal exit never installs an update. Connections, local sources and listening plans stay in the existing app data directory. MPV is separate and is not updated.

Versions 0.2.1 and earlier need one manual installation of 0.2.2 or newer. An integrity or network error prevents installation; check again to retry. If a release has just been published, allow time for its assets to become available. Development builds disable updates.

- Cannot connect: check base URL, reverse-proxy path, network, credentials and permissions. Authenticated requests do not follow arbitrary redirects.
- MPV unavailable: select a valid executable in Settings; the picker checks its control connection.
- No sound: check app volume, Windows mixer, output device and exclusive-mode conflicts.
- Sync failed: playback can continue and the checkpoint remains on this device. Another client may be behind. Automatic offline reconciliation is not implemented.
- Tags unavailable: unsupported metadata does not necessarily mean unsupported audio.
- Playlist rejected: it may be smart, read-only or owned by another user; the server controls permissions.

Normal exit flushes progress. Forced termination or network failure can leave the most recent interval unsynchronized. Never include credentials or the app database in bug reports.
