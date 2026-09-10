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

Use Download beside an album/playlist selection, book, or episode. The original files are streamed to this computer in a single-worker queue. Downloads shows progress, quota, individual Pause/Resume, and Pause all/Resume all. Check individual downloads or Select all, then Remove selected and confirm. Partial selection is shown on the Select all checkbox. The default quota is 20 GB; change it in Settings. Resume continues saved bytes when the server supports validated range requests. Changed files or servers without resume support restart safely. An interrupted app exit leaves unfinished downloads paused. Removing a download deletes only this app's cached copy. Stop that item before removing it.

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

In Settings, below the theme palettes, **Customize this theme** offers background, panel, accent, main text, and secondary text colors, plus interface, heading, and lyric font families. **Preview in app** applies unsaved changes temporarily. **Save theme** (in 0.7.1) or **Save audio preferences** saves audio and appearance together and updates the mini player. Leaving Settings discards an unsaved preview. Use a color's **Default** or **Reset customization** to return to the selected theme. These are local system fonts, with fallbacks if a family is unavailable.

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

## Settings and player polish (0.7.1)

Use the Settings rail to jump to Updates, Servers, Playback, Appearance, Listening, or Sharing. It tracks the visible section and becomes a row of chips in narrower windows. System reduced-motion preferences disable animated jumps.

Appearance previews your theme while you edit. **Save theme** and **Save audio preferences** each save the full current shared preferences draft, including edits in the other section. Leaving Settings without saving restores the saved appearance.

Choose **Solid** (the default) or **Gradient** under Customize this theme to control decorative surfaces throughout the app. Both modes use your selected palette and custom colors. Glass palettes retain translucent blur; lyric backgrounds and playback progress fills remain separate. The choice previews in both windows, saves with **Save theme**, and travels in preference backups. Imported CSS can intentionally override these built-in styles.

Library continuation cards wrap to fit the window. Horizontal scrollbar tracks are hidden throughout the app; Home shelves retain Previous/Next arrows and support trackpad or Shift+wheel scrolling. Vertical scrollbars remain visible.

In Appearance, **Import theme CSS** opens a native picker for a local `.css` file (UTF-8, at most 512 KB). A leading UTF-8 BOM is accepted; NUL characters, embedded BOMs, invalid encoding, and oversized files are rejected. CSS text is stored with preferences, not the original file path. Changes preview in the main and already-open mini player, and persist with Save theme. **Remove custom CSS** previews removal; save to keep it removed. Preference backups include CSS and validate it on restore. The existing Content Security Policy still restricts external resources.

F11 toggles true fullscreen anywhere in the main window. The immersive player also has a Fullscreen button. Escape exits fullscreen. These controls do not change the mini player.

Synced lyrics use real per-word timing when LRCLIB supplies enhanced LRC. For ordinary line-timed records, Flow estimates word progression from word lengths within each line. This is a visual guide, not recorded word alignment; other styles use a smooth line sweep. Plain lyrics stay static. Pausing or buffering stops interpolation; seeking updates the fill. Reduced-motion settings use playback updates without continuous animation. Existing saved matches with line-only data keep working; search and bind the record again to retrieve newly available word timing.

## Immersive lyric styling (0.7.2)

Open Immersive view, then **Appearance**. The popup previews your changes immediately: choose background/shade, font, weight, size, line spacing, alignment, upcoming and sung text colors, current-word color, surrounding-line opacity and glow. Save appearance keeps the choices on this computer; Cancel or Escape restores the previous appearance. Reset appearance previews the defaults until you save.

Choose Flow · word emphasis to enlarge the active word smoothly from its center without moving it upward, Focus for softened surrounding lines, Gentle fade for quiet line transitions, or No lyric animation. Smooth motion also controls the background; system reduced-motion settings take priority. Real word highlights require enhanced-LRC timestamps. For line-only records, Flow uses approximate word emphasis while other styles use a line sweep; plain lyrics remain untimed. The queue stays on the right. Styling is independently implemented with visual inspiration from [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics); its Spotify extension code is not bundled.

## Home and local music (0.7.3)

Home now includes horizontal shelves (scroll or use the arrow buttons), a featured audiobook/episode continuation, and music mixes. Your favorites uses starred Navidrome songs; Back in rotation uses recent music on this device; From your folders uses recent local music. Each mix includes up to 50 tracks and shuffles when played. Empty mixes are hidden until there is real listening data. Home's stats widget refreshes every 15 seconds and on window focus, showing this device's listening today, this week, goal progress, and finished book/episode totals.

**Local music**, under **Your collection**, indexes the subfolders of a native-picker-approved source. Browse Albums, Songs, Artists, Genres, Favorites, Recently added, Recently played, Playlists, or the original Folders view. Album grouping uses album artist and album title; untagged albums use folders. Album detail follows disc/track order. Search covers title, artist, album and genre. Recently added uses file modification dates; Recently played comes from this device's history. Mark individual hearts for favorites. Select songs on a page and choose Create playlist to save a named local playlist; open it from Playlists to play it or delete the list. Original files are never changed.

Use **Rescan library** after adding, changing, moving or deleting files. The first scan may take time. Indexing is limited per source to 50,000 tracks, 5,000 folders and 100,000 directory entries, with visible warnings. Results and playback actions are paginated at 100 tracks. Local favorites, playlists and indexes are device-local; local playlists currently support creation/playback/deletion, not editing, importing, or exporting. Personal backups do not yet include these local-library lists.

In the normal Now playing screen, choose Lyrics, then **Lyrics appearance**. It shares saved typography, colors, word glow, backgrounds and animation settings with the immersive view. Exact word timing depends on the record. Line-only records use approximate word motion in Flow and a line sweep in other styles. Changes made in either player apply the next time the other view opens.

Home shelves hide their horizontal scrollbars. Use the arrow buttons, horizontal trackpad gestures, or keyboard focus to browse each shelf.

## Track artwork, more mixes and translucent panels (0.7.9)

Music and local-library track rows, playlists, both queues, listening history, downloads, notes and Listen later show compact cover thumbnails. Podcast inbox rows use show artwork. Missing covers keep a fallback; local files use embedded artwork. Cover loading stays in the main process and waits until rows approach the viewport. Repeated covers share bounded caches.

Home adds an **Album sampler** from up to four recently played albums, **All together**, **Short & sweet** (up to four minutes), **Take your time** (seven minutes or longer), and up to three artist spotlights. These use your favorites, available listening history and album sample, not invented recommendations. Conditional mixes appear only when enough matching tracks exist; each mix contains at most 50 unique tracks. Music sources keep separate identities. Refresh Home updates the available pool; Play shuffles a mix.

Under Settings → Appearance → Customize this theme, **Translucent panels** adds a blurred, see-through finish within the app. It works independently of Solid / Gradient and previews in both windows. Save theme persists it, including in preference backups. Glass palettes keep their built-in blur. This does not make the native window transparent to your desktop wallpaper.

## Daily-use controls (0.8 local preview)

Use the top-bar search button or Ctrl+K to search your collections. Right-click a track (or focus its control and press Shift+F10) to open playback, queue, favorite, playlist and details actions. Choose a playlist in this menu to pin it to Home.

On Home, choose **Customize Home** to reorder or hide sections and choose visible mixes. **Preview & edit** on a mix lets you exclude artists, shorten it, reshuffle and save it. A mix from one source saves as a playlist; one spanning sources saves in Play queue as a named queue.

Local music supports M3U/M3U8 import through the native file picker. Files must be inside the selected source. Open a local playlist to rename, reorder, remove tracks or export it. Track menus add songs. Folder watching is on by default and can be disabled under Settings → Listening.

Settings → Appearance includes Compact and Comfortable density. Settings → Listening includes music-only automatic queue continuation, keyboard shortcuts, per-show automatic podcast downloads and data removal. Podcast rules copy audio already available on Audiobookshelf, check every ten minutes while the app runs, and never clean up manually downloaded copies.

In either lyrics view, change **Timing offset** to save a correction for that song. Positive values show lyrics later; negative values show them earlier. Manual bindings and offsets are included in personal backups, along with local playlists/favorites, listening history/statistics and Home/shortcut preferences. Backups exclude credentials, media and server progress. Older bindings without a known source identity retain their original identity; opening their song once records that identity for remapping in future backups.

Windows media controls show the current track and accept pause, play, next, previous, stop and seek requests while MPV remains the audio engine. The installer bundles the helper runtime; a separate .NET installation is not needed.

**Remove app data** offers three scopes. Cache cleanup rebuilds metadata/indexes. Personal cleanup removes history, stats, notes, queues, local favorites/playlists and lyric matches. Full reset additionally removes saved accounts, keys, settings and downloaded copies, then restarts. Every choice requires a native confirmation. Original source folders and server data are kept. Export a personal backup before cleanup if you want to retain those collections.

## Library tools, profiles and Recap (local 0.9)

Open **Library tools** in the sidebar for Rediscover, Book series, Podcast subscriptions, Library health, Listening profiles and Connections. These views use your connected sources and saved device history.

Press **Ctrl+Shift+P** for the command palette. Search for a destination, theme, timer or action. Collection edits offer **Undo** briefly; the palette also exposes the last undo after its notification closes. If the collection changed again, undo refuses to overwrite that newer edit.

In **Settings > Playback**, save a listening profile after saving your desired audio/theme/lyric settings. A profile captures current volume and spoken speed too. Applying a profile preserves your current scrobbling and close-to-tray choices. Use **Remember volume & EQ** for the selected output device. Crossfade is off by default; set a duration and save transitions to enable it for music in shared-output mode. Keep the album preference checked to preserve gapless album neighbors.

In either lyrics view, choose **Import lyrics**, **Read embedded lyrics** (local music), or **Edit lyrics & timing**. The editor lets you edit LRC directly or stamp one selected line with the current playback time. Saving binds the result to this song locally; future opens use that saved binding. Originals are never modified.

Open a local or server playlist and choose **Design playlist cover**. Generate a grid or stacked collage, or choose your own PNG/JPEG. Customize the title, size and colors, then save the cover. PNG export is separate from saving the local override. **Restore default cover** removes only that override.

For podcast subscriptions, select an Audiobookshelf podcast library/folder, search by show name or paste RSS, select the results and subscribe. OPML import shows a review list first. Audiobookshelf processes subscription requests in the background, so refresh Podcasts shortly afterward. Audio downloads remain off until you enable them separately. This requires the server's podcast-management permission.

For Recap, open **Listening stats**, choose inclusive dates and create a preview. Pick from **12 different compositions** and **12 independent palettes**, add your own title, and save PNG. Detailed insights below the poster compare the preceding equal-length period, including artist listening. Each design emphasizes different information; changing dates invalidates the previous image until you create a fresh recap.

Connection tools can retry source checks, retry failed playback, open Downloads for offline progress review, and export a redacted diagnostics report. The export excludes connection addresses, file paths, credentials and listening titles.

## Finding your way in 1.0

Use **Settings → Search settings** to find controls by name or topic (for example, “equalizer”, “Discord” or “downloads”). Choose a result to reveal and highlight the setting. Enter chooses the first result; Escape clears the search. Searching does not discard unsaved preferences.

**What's new** appears on the first launch of each version. Close it or follow a feature link to dismiss it for that version. Open it again from **Settings → Updates → What's new**. “Full changelog” opens the project's GitHub changelog in your browser.

When a collection cannot load, use the nearby retry action. A refresh keeps the current library view while it checks connections. Empty-source screens offer setup or folder selection; an unavailable server is not presented as an empty collection.

## Window controls (1.0.1)

The main window uses a title bar that follows the active theme. Drag the title area to move the window; the buttons at the upper right minimize, maximize/restore and close it. Close honors the existing close-to-tray preference. F11 enters fullscreen and hides the title bar; Escape restores the normal window.

In the classic Now Playing screen, **Back to library** sits above the artwork beside the Queue, Lyrics and Immersive view controls.

## Collection navigation

Use the **Customize collections** button beside **Your collection**, or open **Settings → Appearance → Collection controls**, to give Music, Audiobooks, Podcasts, Local music and Library tools their own labels and icons. The icon preview updates while editing; choose **Save collection controls** to apply your changes. **Reset collection defaults** prepares the original labels and icons, then Save applies them. These changes only affect local navigation and do not rename server libraries or change media types.

Select **Listening Space** in the sidebar to collapse or expand its menu. It supports keyboard activation and remembers your choice. MPV setup and its configuration status are in **Settings → Playback → MPV audio engine**.

The button at the left of the top bar switches the full sidebar to an **icons-only rail** and back. Hover an icon to see its name. The sidebar remembers your choice independently of the Listening Space disclosure, and keeps your custom collection icons and selected-page highlight.

## Personal shelves and offline preparation (1.1.0)

Open **Library tools → Personal shelves** to create a shelf. Use **Add to shelf** on an album, playlist, book or show, or open a track's context menu. Each shelf can mix collections and individual items. Use the arrows beside an entry to change its order. **Edit shelf** changes its name, description and cover. Deleting a shelf keeps its media.

Choose **Prepare offline** on a selection or shelf, give the plan a name, then open **Library tools → Offline preparation**. Select the plan and choose **Check readiness**. The check verifies files on this computer and reports known size, unavailable sizes, missing files and remaining download budget. **Download missing items** uses the existing original-audio downloader; check again before disconnecting. Missing local files need to be restored to the selected source folder. Removing a plan keeps downloaded copies.

## Customize details and artwork (1.1.0)

Open a track's context menu, or the controls on a collection header, and choose **Customize details & cover**. Enter the metadata you want to replace, then save. **Restore original details** removes those overrides. They stay in Media Center's database and do not rewrite files or edit the server. Local search and album/artist grouping follow your edits; server search still uses the original server metadata.

Use **Choose image** for a local PNG/JPEG, or search an artist and album under **Find album artwork**. Search results identify MusicBrainz releases, with Apple iTunes used if MusicBrainz cannot connect or finds no releases. Preview the image and choose **Use this cover**; the preview identifies its provider. There is no additional API key. Remove a custom cover to return to the original artwork or the bundled Media Center fallback.

For Discord, a selected public Cover Art Archive or Apple iTunes match can be shared directly. In 1.1.1, missing music artwork automatically uses the branded default cover from the project's published GitHub image. No manual asset upload or Last.fm key is needed for this fallback. Your private server and local artwork are never uploaded.

## Show defaults, people and list views (1.1.0)

Open a podcast show and expand **Playback preferences for this show**. Save its speed, intro/outro seconds and preferred episode order. These are manual skip durations, not automatic ad detection. They apply on episode start; an explicit seek is kept, and a saved per-episode speed has priority.

**Library tools → People** searches artists, authors or narrators across your connected collections. Books also provide author/narrator shortcuts, and album/track controls provide **Explore artist**. Open a result to see and play the items available in your libraries.

Use **Customize columns** in a music or local track list to choose and reorder columns, then save a named view. The saved-view selector switches between layouts. Titles, covers and playback controls remain accessible, including at narrow widths.

## Private listening (1.1.0)

The shield button in the top bar toggles **Private listening**. While enabled, new listening is excluded from device history/statistics, music scrobbles and Discord presence. Audiobook and episode positions still sync so you can resume later, with no listening-time increment from the app. Your server can still log media requests. The mode ends when the application closes; explicitly saved shelves, plans and downloads are kept.

## Navigation and immersive controls (1.1.1)

Settings → Appearance → Collection controls lets you move collections up/down, rename them and choose icons. Enable **Show Play queue directly below Home** to move the queue out of Listening Space. Library tools now belongs to Listening Space. The collection Customize shortcut is hidden in the collapsed sidebar; Settings remains available.

In music's immersive view, **Show Now Playing** hides lyrics and uses the same title/creator stage as podcasts. **Show lyrics** switches back; the choice is saved. **Lyrics tools** beside Fullscreen and Appearance opens search, import, editing, refresh, saved-match and timing/follow controls. The main stage contains the track title and lyrics. Books and podcasts keep their current Now Playing/chapter view.

### Refreshed mini player (1.1.1)

Open the mini player from the main playback bar. Its app-icon header is draggable; pin, restore and close stay at the top right. Song artwork and two-line titles sit above centered playback controls. The themed seek bar uses the same click, drag and keyboard behavior as the main player, with elapsed and total time always shown. Minimum size is 360 × 232 pixels.

## Custom mixes (1.2.0)

Choose **Create mix** on Home, Music or Local music. Select your music sources and give the mix a name. A recipe with no rules considers every scanned song. Add a rule group to narrow it by genre, artist, release year, duration, favorites or other available tags. Use “All conditions” for AND, “Any condition” for OR, and “No conditions” to exclude matches. Multiple groups can also be combined with AND or OR.

Choose the order, track limit and optional maximum per artist. **Preview mix** loads a catalog and shows matching songs with cover art and total duration; artist/genre suggestions become available after the first preview. Read any source warnings before playing. **Refresh sources** reloads the catalog instead of using the two-minute cache. **Save mix** keeps the recipe locally. Open it later from Home or **Library tools → Custom mixes**, preview fresh matches and play or queue them. Personal backups include your recipes.

On Home, **Load more albums** expands Recently played albums. In each collection, use the underlined views below the header; Audiobooks and Podcasts include a dedicated Continue listening view.

### Collection shortcuts and actions

In **Settings → Collection controls**, enable **Show Playlists directly below Home** to browse server or local playlists from the sidebar. Collection headers keep primary actions together and place editing, export and other secondary commands under **More options**. Right-click a track, artist, album or playlist for its actions; focused track controls and collection cards also support **Shift+F10**.

Audiobook and podcast **Continue listening** tabs show resume cards in a grid. **All books / All shows** remain focused on browsing the library; Home keeps its continuation slider.

In Podcasts, **Finished episodes** shows completed episodes from the selected library. Search by show or episode title, sort the results, replay an available episode, or choose **More options → Mark unfinished**. **Refresh progress** reads the latest server completion state.

Selecting an artwork search result previews it in the top cover box. Choose **Use this cover** to save it or **Cancel preview** to return to the current image. Portrait images are fitted inside the square without stretching. Album headers include **Explore artist** alongside playback, while downloads are under **More options**. Right-click menus separate playback/favorite, customization, and playlist actions.

### Collection and queue controls (1.2.1)

Use the collection header’s **More options** for shelf, offline and customization tools. Selecting tracks reveals **Selection options** for those tracks. For a server playlist, open **Customize details & cover → Generate cover**; local playlists use **Customize playlist → Cover art**. Each episode keeps playback in its footer; mark finished/unfinished, reset and customization are in its More menu.

Expand **Saved queues**, enter a name and choose **Save current queue**. Each saved entry offers Resume; More options contains Load queue, Replace with current and Delete. On desktop Now Playing layouts, scroll the queue on the right while artwork and song details remain on the left.
