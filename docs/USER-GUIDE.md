# User guide

## Music and playlists

Choose a music library and view: Albums, Recently added, Recently played, Most played, Songs, Artists, Playlists, Favorites, Genres, Radio, or Rediscover. Server pagination supports large catalogs. Catalog selections apply to the loaded catalog page. Inside an album or playlist, Select all tracks selects the entire collection, including other track pages.

Open an artist to browse their albums. Open an album to play or select its tracks. Heart buttons update favorites; song star selectors update ratings. Search returns the entity types appropriate to the view.

Create playlists from Playlists → New playlist. Select songs elsewhere and choose Add to playlist. Playlist arrows change server order; remove controls remove entries without deleting files. Duplicates are preserved. Read-only or smart playlists are played here but managed on the server. Playlist deletion requires confirmation.

Radio plays stations configured on Navidrome. Live stations do not have a seekable duration.

## Books and podcasts

Book libraries contain books. Chapters are whole-book markers and can cross physical files. Use Chapters to jump to a position; Audio files exposes the underlying file boundaries. Resume uses the latest Audiobookshelf server position. Speed is saved per book or episode.

Podcast libraries contain shows. Shows contain independently playable episodes, each with its own status, availability, and resume position. Search episode titles, subtitles, descriptions and filenames. Sort by date, title, season, episode number, filename, duration or progress. Filter by status and downloaded availability. List-level playback actions include downloaded matching episodes in the displayed order.

Status filters include Not started, In progress, Unfinished and Finished. Mark finished/unfinished affects the selected book or episode only. Reset asks for confirmation. Changing the actively playing item's status first stops and flushes it so subsequent session updates cannot undo the manual change.

Audiobookshelf library search is relevance-ranked, capped at 100 matches. Clear it to use full-library server sorting and pagination. Continue Listening shows recent book and episode progress; use Refresh progress to obtain changes from other devices.

Book bookmarks are saved on Audiobookshelf. Add a title and position; the default is the active book's playhead or saved book progress. Bookmarks can be played, renamed with Edit, or deleted. Editing keeps the original timestamp. Use Listen later for a future date.

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

## Home and podcast inbox

Home brings together Continue Listening, recent music albums, the latest unfinished indexed episodes, and your upcoming plans. Use the top-right Play icon on a card; the ellipsis opens queue, Listen later, and download actions for books and episodes. Refresh Home requests current server data. The first podcast index fetches expanded shows; large libraries may take a while. Partial refresh failures are displayed.

Podcast inbox combines episodes across connected podcast libraries. Search by episode or show, choose a status, and order by newest, oldest, or show title. Select this page selects only its 60 entries. Mark selected finished/unfinished writes each exact episode separately and reports failures. Cached inbox data refreshes in the background after five minutes; use Refresh episodes for an explicit refresh.

## Downloads and offline progress

Use Download beside an album/playlist selection, book, or episode. The original files are streamed to this computer in a single-worker queue. Downloads shows progress, quota, individual Pause/Resume, and Pause all/Resume all. Check individual downloads or Select all, then Remove selected and confirm. Partial selection is shown on the Select all checkbox. The default quota is 20 GB; change it in Settings. Resume restarts that item’s download from the beginning; byte-range continuation is not yet implemented. An interrupted app exit leaves unfinished downloads paused. Removing a download deletes only this app's cached copy. Stop that item before removing it.

Ready downloads are preferred automatically for playback. Up to 32 recent cover images (at most 1 MB each) are cached separately from the audio quota; older offline items may show generated artwork. Books retain physical-file offsets and whole-book chapters; podcasts download only the chosen episode. Offline book/episode positions are checkpointed separately. The app does not replay uncertain listening-time deltas or automatically overwrite server progress.

When online, choose **Downloads → Sync saved position**. Playback of that item stops and you see this device's position beside the server's. Choose **Use this device's position** only when that is the position you want on other clients. The server is checked again before writing; if it changed after the preview, preview again. This writes the absolute position and completion state, not historical listening-time totals.

## Mini-player, gapless playback and saved queues

The small window icon at the right of the player opens the mini-player. Drag its header to move it. It starts always on top; the pin toggles that behavior. Controls share the same MPV player and queue as the main window. Closing the mini-player does not stop playback. Expand returns to the main window.

Gapless playback prepares the next music/local track in MPV. It works best for compatible adjacent formats; a device format change or slow network can still cause a gap. Crossfade is not included, and no resampling is forced to hide format changes. Gapless preference changes apply when preparing the next playback. Smart rewind backs up five seconds after a break of at least ten seconds and fifteen seconds after five minutes, by default. Change both amounts or disable rewind in Settings. Explicit seeks, chapters, and note positions remain exact.

Open Saved queues on the Play queue page. Give the current queue a name, then save it. Resume starts at its saved index and position; Load queue restores it without autoplay. Replace with current updates an existing saved session. Drag rows to reorder within a displayed queue page, or use the arrow controls to move across page boundaries. Long queues and track collections render 100 rows per page.

## Notes, rule playlists and listening habits

Listening notes → Note this moment saves the active item and current timestamp. Add a title and text, search your notes, edit them, or Play from here. Notes remain on this computer; use personal backup to move them. Audiobookshelf's server bookmarks remain a separate book-only feature.

Rule playlists evaluate your Navidrome library when you choose Play or Queue. Combine favorite status, minimum rating, genre, artist, unplayed status, and year range. Choose title, artist, or random order and a result limit. They do not change Navidrome's native smart-playlist definitions.

Music → Playlists supports Media Center JSON export/import. Exported files contain track identifiers and descriptive metadata, never stream credentials. Import into the same Navidrome server to create a private playlist; track order and duplicates are retained. M3U/XSPF and cross-server matching are not yet implemented.

Listening stats counts time actually spent playing on this device, excluding pause and buffering. It shows a 30-day bar chart including days without activity, daily totals, media categories, top listens and completion counts. Hover over a bar for its date and listening time; the daily breakdown lists the same data in text. Set a daily minute goal in Settings; zero disables the goal. Existing server statistics are not imported.

## Manual lyric matches and theme customization

Open Now Playing → Lyrics (or the immersive player), then **Find lyrics**. Search by song, artist, or album, select a result to preview its lyrics and duration, and choose **Use these lyrics**. The selected record and its text are stored in SQLite for that source/song. They do not expire or require another search, even offline. **Clear saved match** restores automatic lookup; **Find lyrics** lets you replace the choice. Manual choices can select a different recording length, so check the preview and timing. Books, podcasts, and radio do not offer lyric search.

In Settings, below the theme palettes, **Customize this theme** offers background, panel, accent, main text, and secondary text colors, plus interface, heading, and lyric font families. **Preview in app** applies unsaved changes temporarily. **Save audio preferences** saves audio and appearance together and updates the mini player. Leaving Settings discards an unsaved preview. Use a color's **Default** or **Reset customization** to return to the selected theme. These are local system fonts, with fallbacks if a family is unavailable.

Appearance preferences are included in personal backups. Manual lyric bindings currently remain only in this device's database and are not included in exported backups.

## Personal backups

Settings → Export personal backup saves preferences, named queues, listening notes, Listen Later plans, local rule playlists, and source references. It excludes passwords, Last.fm keys, Discord configuration, MPV paths, downloaded audio, listening statistics, and server progress.

Preview a backup before restoring. Connect matching servers with the same base URL and username, and choose the original local roots through the native folder picker. No arbitrary folder or executable is imported from a backup. Restore replaces the listed personal collections and preferences in one database transaction. Export your current data first if you want to retain it.

## Discord and Last.fm

Version 0.6.2 supports Last.fm's current image host and checks cover availability before sending it to Discord. If that host returns a missing image, the app checks the same public image on Last.fm's older CDN. Earlier cached misses are refreshed automatically. Keep a saved album correction if it matches the intended release; use Retry artwork to request a fresh lookup. A successful artwork status means a reachable image was selected, while Discord controls its final display.

Discord integration is optional and off initially. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications), name it Media Center, and copy the numeric Application ID from General Information. No bot token or client secret is needed. Keep the Discord desktop app open, enable activity sharing in Discord, and save the Application ID in this app's Settings before enabling presence.

Choose which media types to share. Music is selected initially; books, podcasts, and local files are private unless enabled. Pause handling is configurable. Disconnects are retried automatically. Media Center only updates your activity; it does not send Discord chat messages.

Enter your own Last.fm API key privately in Settings for album artwork. It is encrypted using Windows protection. Album artist/title metadata goes to Last.fm and only a public Last.fm CDN image URL goes to Discord. No private cover URLs or server authentication are shared. Correct the current track's album artist/title in the artwork correction section when needed. Books and podcasts currently show text without uploaded private covers. Live profile verification requires your Application ID and running Discord client.

## Troubleshooting

For updates, open **Settings → App updates**. Check for updates, download the offered stable version, and choose Restart and install when ready. Downloading can run while you listen. Installation stops playback and saves the queue and listening session. Normal exit never installs an update. Connections, local sources and listening plans stay in the existing app data directory. MPV is separate and is not updated.

Versions 0.2.1 and earlier need one manual installation of 0.2.2 or newer. An integrity or network error prevents installation; check again to retry. If a release has just been published, allow time for its assets to become available. Development builds disable updates.

- Cannot connect: check base URL, reverse-proxy path, network, credentials and permissions. Authenticated requests do not follow arbitrary redirects.
- MPV unavailable: select a valid executable in Settings; the picker checks its control connection.
- No sound: check app volume, Windows mixer, output device and exclusive-mode conflicts.
- Sync failed: playback can continue and the checkpoint remains on this device. Another client may be behind. For downloaded spoken audio, use the explicit position preview/sync in Downloads; automatic reconciliation is not implemented.
- Tags unavailable: unsupported metadata does not necessarily mean unsupported audio.
- Playlist rejected: it may be smart, read-only or owned by another user; the server controls permissions.

Normal exit flushes progress. Forced termination or network failure can leave the most recent interval unsynchronized. Never include credentials or the app database in bug reports.
