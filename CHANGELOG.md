# Changelog

## 1.2.3

Artist pages, clearer artwork and smarter lyric lookup.

- Play saved custom mixes directly from Home and Library tools, with loading feedback and a clear message when no tracks match.
- Keep custom mix actions visible within their Home cards.
- Show immersive artwork as a rounded square and enlarge Now Playing artwork while keeping the queue independently scrollable.
- Align saved track columns with consistent spacing and responsive metadata rows.
- Open a dedicated artist page from Now Playing, artist cards and Explore artist, with albums, playable tracks and local-artist support.
- Group lyric tools on the same row as Lyrics appearance.
- Fill the artwork editor preview with the original track cover instead of a tiny nested thumbnail.
- Automatically read embedded lyrics for local music and Navidrome lyrics for server tracks before trying LRCLIB; preserve manually saved lyrics and show the active source.

## 1.2.2

Discord artwork for every shared listen.

- Use the branded default cover for every enabled Discord media type, including audiobooks and podcast episodes. Keep private listening and individual media-sharing preferences enforced.
- Allow already-selected, validated public artwork for spoken Discord presence without sending book or episode metadata to Last.fm.
- Preserve the generated audiobook and podcast covers inside the app.

## 1.2.1

Consistent library controls and a calmer listening workspace.

- Consolidate album, playlist, audiobook and podcast actions in their collection headers; show selection tools only for selected tracks.
- Keep More options menus opaque and above surrounding controls, with keyboard navigation and viewport-aware placement.
- Integrate playlist cover generation into customization and fix generated-cover preview proportions.
- Use one playback row per podcast episode, with progress and personal actions in More options.
- Redesign Saved queues with a named save form and organized resume, load, replace and delete actions.
- Keep Now Playing artwork stationary while its queue scrolls independently on desktop layouts.

## 1.2.0

Custom mixes and collection refresh.

- Create saved music mixes using artist, genre, album, title, format, release year, duration, favorite status, and available Navidrome ratings/play counts. Combine AND/OR/NOT condition groups, choose multiple music sources, sort or shuffle, limit tracks per artist, and preview before playing or queueing.
- Manage and duplicate mixes from Library tools; open saved mixes directly on Home. Recipes are included in validated personal backups with source remapping.
- Remove the eight-album limit on Home. Load a full page per Navidrome server and request more without replacing the albums already shown.
- Refresh music, local music, audiobook, podcast and Library tools headers with collection icons, custom names, compact actions and underlined navigation. Books and podcasts have dedicated Continue listening views; books also have a Finished view.
- Keep mix scans in the main process, with bounded catalogs, explicit partial-result warnings and no writes to original music files or server tags.
- Keep collection header actions in one row with a More options menu. Show Continue listening as a dedicated book/podcast grid, widen Settings search, align People search controls, and optionally pin Playlists directly below Home.
- Fix artist playback in the music browser and playback/queue actions after local metadata edits. Show action errors within dialogs instead of hiding them behind overlays.
- Enable mouse and keyboard context actions on artist, album and playlist cards and missing track rows, including People results. Keep actions bound to the correct item.
- Add paced, cached Apple iTunes artwork search when MusicBrainz cannot connect or returns no releases. Save selected covers for tracks/albums and retain validated public image sources in personal backups and Discord.
- Reset track pagination when the displayed collection changes to avoid empty later pages. Clear stale artwork previews on failed requests and keep continuation progress bars inside their grid cards.
- Preview selected artwork in the original square cover box above search, with contained portrait images and an explicit Cancel preview action.
- Group library selection/view tools and separate right-click playback, customization and playlist actions. Favorite joins playback actions; Explore artist joins album header actions; Download moves into More options.
- Browse Finished episodes in each podcast library, with search, sorting, playback and Mark unfinished. Completion is scoped to server, library, show and episode.

## 1.1.1

- Redesign the mini player with the app icon, larger square artwork, clear song details, centered transport controls and the main player’s themed seek bar with elapsed/total time.
- Automatically send the published Media Center default cover to Discord when music artwork is unavailable. No manual Discord asset upload or Last.fm key is needed for the fallback.
- Hide collection customization when the sidebar is collapsed. Move Library tools into Listening Space, add manual collection ordering and an option to place Play queue directly below Home.
- Music can switch between lyrics and the same immersive Now Playing layout used for books and podcasts. The choice is saved.
- Move immersive lyric search, import, editing, refresh and timing/follow options into a header popup beside Fullscreen and Appearance. The lyric stage keeps the track title and lyrics.

## 1.1.0

- Create personal shelves combining albums, playlists, artists, books, podcast shows and tracks, with custom covers and manual ordering.
- Edit titles and metadata on this device, import artwork, or search MusicBrainz and Cover Art Archive without an additional API key. Original files and server metadata stay untouched.
- Explore artist, author and narrator pages; save track-list column layouts.
- Prepare named offline plans with readiness, file-integrity, storage estimates and download/retry actions.
- Save podcast speed, intro/outro skips and episode order per show.
- Enable session-only private listening to pause history, stats, music scrobbling and Discord sharing while retaining spoken resume positions.
- Customize collection names and icons, collapse Listening Space or the full sidebar, and find MPV status in Settings.
- Fix clipped Continue Listening subtitles and use consistent arrow-controlled shelves on Home, audiobooks and podcasts.
- Add branded fallback music artwork and a Discord fallback export/setup option. Discord requires uploading the asset to your own application.
- Include personal library settings and artwork in validated personal backups and data removal.

Windows x64; MPV is installed separately. Artwork availability depends on the public catalog. Metadata edits are device-local.

## 1.0.1

- Replaced the native main-window title bar with theme-aware minimize, maximize/restore and close controls, plus a draggable title region. Fullscreen hides the title bar; close-to-tray retains its existing behavior.
- Moved the floating Now Playing close icon into a compact header with a labeled Back to library action and the Queue, Lyrics and Immersive controls.
- Window operations use a validated main-window-only IPC route; the mini player cannot control the main window.

## 1.0.0

The first major Media Center release brings together music, audiobooks, podcasts and local libraries.

- Search Settings by name or topic, jump to the relevant control and highlight it without losing unsaved preferences.
- A compact What’s new screen opens once per version, with feature shortcuts and a full changelog link. Reopen it from Updates.
- Consistent controls, focus indicators, spacing, responsive dialogs and layouts for smaller effective viewports and display scaling.
- Clear loading, empty and failure states with useful retry, connection and folder actions.
- Includes the local-preview improvements since 0.7.7: library tools, profiles, queue/playlist undo, local and embedded lyrics, lyric timing editing, custom playlist covers, optional native crossfade, and 12 Recap layouts with 12 palettes.
- Refreshed documentation, project website and repository artwork.

Windows x64. MPV is supplied separately; the installer is unsigned. Server feature parity remains an ongoing goal.

## 0.9.2

- Collection artwork now grows to match the complete header content height while remaining square, with equal top and bottom padding.
- Home featured artwork fills the inner card height rather than using a small fixed thumbnail.
- Narrow detail headers keep readable, wrapping action rows beside the larger cover; exceptionally narrow layouts stack the square above the content.
- Local Windows preview only.

## 0.9.1

Local preview.

- Consistent square cover frames across playlist, album, artist, audiobook, podcast and local collection detail headers. Portrait book artwork remains fully visible inside its square frame.
- Full-width action rows with equal button sizing, responsive wrapping, and a separate management row.
- Local collection headers now include artwork and grouped playback controls.
- Listening summary cards share aligned labels and contextual footers; daily goal progress is a percentage instead of a lone slider-like bar.
- Local Windows release only; no GitHub publication.

## 0.9.0



Local preview; not published to GitHub.



- Rebuild Recap with 12 distinct poster compositions, 12 independent palettes, editable titles and 1080 × 1440 PNG exports. Add artist rankings, streaks, busiest day, daily average and comparison with the preceding equal-length period.

- Add a searchable command palette (Ctrl+Shift+P), guarded undo for queue/playlist/favorite edits, saved listening profiles and per-output volume/EQ memory.

- Import local LRC/TXT and embedded song lyrics, edit text and line timestamps, and retain per-song bindings in personal backups.

- Design local playlist covers from album collages or imported pictures; customize title/colors and export PNG.

- Add Library tools: explainable rediscovery, ordered audiobook series, local-library health checks, podcast search/RSS subscriptions/OPML, connection retry and redacted diagnostics.

- Add optional MPV music crossfade in shared-output mode, with an album gapless preference. Books, podcast episodes and radio keep their distinct playback behavior.

- Expand desktop checks for the new workflows, native overlap/pause/stop, embedded lyrics and all Recap styles.



## 0.8.1



Local preview; not published to GitHub.



- Keep Customize Home and Refresh Home together in a responsive header action group.

- Arrange Listening settings in a consistent sequence with aligned fields, grouped toggles and separate save footers.

- Refine podcast rule controls, shortcut labels, backup and reset rows, Discord artwork actions, appearance controls and playlist dialogs.

- Add responsive layout checks for Home action spacing and Settings panel alignment.



## 0.8.0



Local preview; not published to GitHub.



- Customizable Home sections, pinned playlists, mix previews with exclusions and length controls.

- Unified collection search, track context menus, configurable shortcuts and compact density.

- Local playlist editing and M3U import/export; watched folders preserve favorites and playlists across renames within a source.

- Optional music-only queue-end autoplay and per-show automatic offline podcast retention.

- Validated HTTP range download resume and per-song lyric timing offsets.

- Windows media controls with artwork, playback metadata, seeking and transport commands.

- Expanded personal backups and scoped cache, personal-data and full application reset controls.





## 0.7.9



- Add lazy-loaded cover thumbnails to music and local track lists, playlists, normal and immersive queues, downloads, history, listen-later plans, notes, podcast inbox and listening leaders. Share bounded in-flight artwork caches and retain source-specific identities.

- Expand Home with an album sampler, a combined mix, short/long track mixes and up to three artist spotlights, generated only from available music. Mix cards include artwork.

- Add optional translucent panels in Appearance, independently of Solid / Gradient, with live main/mini preview, saved preferences and backup support. This is an in-app effect, not desktop wallpaper transparency.





## 0.7.8



- Add a live Solid / Gradient surface toggle in Appearance, saved with theme preferences, synced to the mini player and included in preference backups. Solid is the default; Glass keeps its blur and lyrics backgrounds remain independently configurable.

- Unify cards, borders, fields, tabs, dialogs and hover/focus states across all 13 palettes. Reduce decorative gradients and accent glow.

- Hide horizontal scrollbar chrome throughout the desktop UI while retaining scrolling. Library continuation cards wrap into a responsive grid; Home shelves retain their arrows.





## 0.7.7



Public rollout of the 0.7.1–0.7.6 improvements: Home shelves and mixes, the tagged local music library, shared lyric appearance and centered word emphasis, theme-aware Settings and CSS import, larger player artwork and clearer volume controls.



- Correct the desktop validation harness on Windows runners: show test windows without taking focus and wait for scrolling to settle before testing the reverse arrow, using the UI's two-pixel start boundary. Version 0.7.6 stopped at its validation gate and was not published as a GitHub release.

- Refresh README and website release links for the successful rollout. See 0.7.6 below for the full feature summary.



## 0.7.6



Prepared after 0.7.0, including the locally tested 0.7.1–0.7.5 improvements below; publication was stopped by a desktop validation timeout and superseded by 0.7.7.



- Make volume easier to see and adjust with a wider, filled track, larger thumb, keyboard focus ring and percentage. Enlarge bottom-player artwork to 72px (64px on narrower windows).

- Add a new Home with continuation shelves, favorites/recent-music mixes and device listening stats. Give local music a persistent tagged library with albums, songs, artists, genres, favorites, recents, playlists and folders.

- Share lyric appearance controls across normal and immersive views, including fonts, colors, backgrounds and centered word emphasis. Use enhanced-LRC word timestamps when available and clearly described visual estimates for line-only records.

- Group and theme Settings, add custom CSS import with preview and backup support, and polish fullscreen, seek controls and accessibility. Coalesce high-frequency MPV telemetry to reduce renderer churn.

- Refresh the README and GitHub Pages feature guide with current, reviewed screenshots. Earlier local versions were not published separately.



## 0.7.5



- Replace Flow's upward word lift with smooth enlargement from each word's center in normal and immersive lyrics. Reserve room for the larger word so neighboring text does not jump or overlap.

- Rename the choice to Flow · word emphasis and match the appearance preview. Existing Flow preferences carry over automatically; reduced-motion and Smooth motion settings remain respected.



## 0.7.4



- Fix Flow word lift in normal and immersive lyrics. Line-timed records now get presentation-only word estimates; real enhanced-LRC timestamps retain priority. Increase the visible lift and keep wrapping stable as lines change. Respect Smooth motion and system reduced-motion settings.

- Hide horizontal Home shelf scrollbars while retaining previous/next arrows, keyboard access and horizontal gestures.



## 0.7.3



- Share lyric appearance, word colors, typography and animation styles between the normal and immersive players, with the customization popup available in both.

- Redesign Home with a featured continuation, horizontal shelves, shuffled favorites/recent-music mixes, and a live device listening widget with daily goal and seven-day activity.

- Move Local music into Your collection. Add a persistent recursive metadata index and Albums, Songs, Artists, Genres, Favorites, Recently added, Recently played, Playlists and Folders tabs, search, rescan, source-specific favorites and playlist creation.

- Bound indexing and paginated results, keep media read-only, guard junction/traversal access, and defer local artwork reads until tiles approach the viewport. Shelf action menus use native popovers to escape scrolling containers.



## 0.7.2



- Match Settings navigation to the app's pill buttons with a filled active state.

- Add an immersive lyrics appearance popup with live preview, save/cancel/reset, six system fonts plus the theme font, size/weight/spacing/alignment, upcoming/sung/current-word colors, dimming, glow and background shade.

- Add Flow word lift, Focus soft blur, Gentle fade and no-animation choices with reduced-motion support. Keep native word timing and the line-sweep fallback; retain the current queue beside the lyrics.

- Preserve older immersive preferences during migration. Validate every saved appearance value in the main process.



## 0.7.1



- Coalesce MPV position, buffering, and codec telemetry before cloning/broadcasting state, with a 250 ms interval and trailing delivery. Commands, errors, and status transitions publish immediately.

- Group Settings into Updates, Servers, Playback, Appearance, Listening, and Sharing with a sticky section rail, active tracking, and compact navigation chips. Apply the active theme to every settings surface, including translucent Glass panels.

- Separate Save theme from Save audio preferences while sharing one complete draft. Add validated local UTF-8 CSS import (512 KB limit), preview, removal, mini-player synchronization, and preference-backup support.

- Render enhanced-LRC word timestamps as karaoke fills, with a line-sweep fallback and reduced-motion support. Add main-window fullscreen using F11, Escape, or the immersive header.

- Polish controls with custom checkboxes, themed hover feedback, consistent form heights, chapter seek markers, a visible seek thumb, and an expanding volume control.



## 0.7.0



- Add manual LRCLIB search with result metadata, synced/plain indicators, lyric previews, and a per-song saved match. Store the selected lyrics in SQLite outside the expiring cache, so reopening the song needs no provider or LRCLIB request. Replace or clear a match from the lyrics panel.

- Guard manual binding against track changes and keep music/local identities distinct. Books, podcasts, and radio do not use lyric search. Share bounded, sequential requests and rate-limit handling across automatic lookup, search, and record retrieval.

- Add theme customization in Settings: background, panel, accent, main/secondary text colors, and interface, heading, and lyric fonts. Include preview, per-color defaults, reset, persistent preferences, and live mini-player updates. Font choices use local system families with fallbacks.

- Include the Last.fm image host and verified image fallback fixes from 0.6.2, plus the structured HTTP error handling from 0.6.1.



## 0.6.2



- Accept Last.fm's current `lastfm-img.freetls.fastly.net` artwork CDN. Valid covers from this host were incorrectly reported as missing and omitted from Discord presence.

- Check image responses before sending artwork to Discord. When a current-CDN image returns 404/410, try the same public image path on Last.fm's older CDN; keep image service failures distinct from missing matches.

- Invalidate earlier artwork lookup caches so a cached miss does not hide a newly supported cover. Preserve HTTPS, exact-host, placeholder, and credential checks.

- Add regressions for the corrected Pritam album response, old cached misses, and Discord artwork URL validation.



## 0.6.1



- Read structured Last.fm API errors on HTTP 400/403/404 responses. A missing-album API error can now continue to track matching instead of stopping with a generic HTTP 404 error.

- Keep invalid-key, rate-limit, malformed/proxy response, and server failures distinct; never cache those failures as missing artwork.

- Remove the speculative rate-limit message from the artwork refresh acknowledgement. Add four regressions covering non-2xx Last.fm responses.



## 0.6.0



- Add an optional immersive playing screen: large synchronized lyrics on the left, artwork and playback controls above the current queue on the right. Open it from Now playing > Immersive view; Classic view returns to the existing layout.

- Add five background styles (Aurora, blurred artwork, Midnight glass, Sunset, Starlight), saved 24-64px lyric sizes, smooth lyric/background motion, and reduced-motion support. Books retain chapter navigation; podcasts and radio never request song lyrics.

- Replace main and mini-player seek handling with captured pointer drags, first-click seeking, keyboard controls, cancelled-drag cleanup, and track-scoped preview state. Validate queued seek identity in the main process so an old drag cannot seek a different track or episode.

- Include the Discord artwork improvements prepared for 0.5.1. Add native screen/seek checks and book/podcast seek regressions.



## 0.5.1



- Add Last.fm track matching when an album lookup has no usable cover, including music without an album tag. Preserve explicit album corrections and reject placeholder/private artwork URLs.

- Retry transient artwork errors on the same track, provide a Retry artwork control, and show connection and artwork status separately so acknowledgements and saved-preference notices do not hide failures.

- Explain how to rename the Discord application to Media Center in the Developer Portal; the Discord heading is controlled by that application name.

- Add artwork fallback, cache, privacy, authentication, retry, response-size and Discord acknowledgement regressions.



## 0.5.0



- Fix nested search-field backgrounds and constrain window scrolling to the content pane, keeping the player anchored at the bottom.

- Add Black Glass: black/grey blurred panels and neutral accents, bringing the theme count to 13.

- Add on-demand LRCLIB lyrics in the expanded player: synced lines, click-to-seek, follow playback, plain text, instrumental and missing-match states. Music and tagged local files are supported; spoken media and radio are excluded.

- Keep lyric requests in the main process with bounded responses, exact metadata/duration lookup, caching, request deduplication/spacing and Retry-After handling. Add LRC, response, privacy and native seek regressions.

- Update the former no-lyrics requirement following the user’s explicit request.



## 0.4.0



- Add ten themes: Glass, Midnight, Ocean, Rose, Lavender, Ember, Coffee, Nord, Monochrome, and Aubergine. A visual palette picker preserves Forest and Charcoal; saved themes update both player windows.

- Add a date-range listening recap with three poster styles, a preview, and native PNG export at 1080 × 1440. Totals, top listens, unique items, active days, media mix, and completions use locally recorded listening within the inclusive date range.

- Read the actual mini-player pin state, persist pin choice across reopenings, synchronize native state changes, and surface pin failures. Add focus/reopen regression checks.

- Add calendar validation, book/episode aggregation tests, theme persistence checks, and real PNG export coverage.



## 0.3.6



- Apply an explicit Windows mini-player pin level so taskbar repositioning does not clear always-on-top; verify pin, unpin, and re-pin in the native desktop suite.



- Replace the plain daily listening list with a readable table, recent active days first, media totals, weekday labels, and an optional quiet-day view.

- Fill the Continue Listening grid with evenly sized responsive cards, removing the unused right-hand gutter on full rows.

- Move episode status and playback controls into a dedicated right-hand column on wide windows; keep the stacked layout on smaller windows.

- Add desktop layout coverage for a populated Home grid, daily table filtering, and episode controls at three window widths.



## 0.3.5



- Resolve the configured download storage root before checking child paths, allowing valid Windows short paths and folder aliases without allowing redirected download directories.

- Add regression tests for normal storage, aliased storage, and refusal to remove a directory redirected outside the storage root.

- Includes the 0.3.3 UI/download changes and 0.3.4 stream-close handling. Neither earlier tag was published: Windows CI blocked them before release while the cleanup issue was investigated.



## 0.3.4



- Wait for the download output stream to close before deleting partial files after cancellation; retry transient Windows file locks during cleanup.

- Includes the chart, selection, pause/resume, and simplified-card changes listed under 0.3.3. The v0.3.3 tag remains an implementation snapshot; its release stopped at a Windows cancellation regression before publication.



## 0.3.3



- Fix the listening graph with 30 calendar-day slots, zero-activity days, date and time labels, hover values, and an empty state. One listening day is now one narrow bar.

- Add download checkboxes, Select all with partial-selection state, confirmed bulk removal, Pause all, Resume all, and clearly labeled individual pause/resume controls. Resume restarts the item from the beginning.

- Serialize download controls, await active cancellation before removal/resume, and hold the worker during bulk changes. Failed removals retain their entries; playing downloads are protected.

- Simplify Home and library resume cards with a top-right Play icon and a More actions menu. Album Play moves onto the artwork; title and creator rows stay aligned.

- Reduce listening-history row height and balance Home navigation spacing.

- Add regression coverage for chart calendars, active/queued book and episode downloads, selection/removal, and simple card layouts.



## 0.3.2



- Shrink Home album cards to a bounded 180-pixel width and keep long titles and fallback artwork compact. Sparse sections no longer expand their cards to fill the window.

- Make Home and library Continue listening cards shorter, with aligned progress and one row of accessible icon actions. Play remains visually prominent.

- Reduce collection header artwork and spacing; group Export, Edit, and Delete playlist controls together.

- Fix undersized listening-note search fields and allow long introductory copy to wrap.

- Add Electron layout coverage for long titles, sparse collections, control hit areas, and search fields at 1008, 1440, and 1920 pixels across both themes.



## 0.3.1



- Keep playlist playback actions aligned at the smallest Windows content width by showing Download as an accessible icon button there.

- Exercise that exact viewport in the desktop regression suite, independent of the runner's display size.

- Preserve the podcast index and Last.fm artwork cache across library refreshes and app restarts; invalidate the podcast index after manual status changes.

- Includes the 0.3.0 daily-listening feature set. The v0.3.0 tag is retained as the first implementation snapshot; its release workflow stopped at the small-window layout check before publication.



## 0.3.0



- Added Home with Continue Listening, recent albums, fresh episodes, and upcoming listening plans.

- Added a cross-show podcast inbox with search, ordering, status filters, pagination, and bulk completion updates.

- Added original-audio downloads with queue status, a configurable disk quota, interruption/retry handling, and native offline playback. Multi-file book timelines remain separate from chapter markers and episode identities.

- Added offline position previews and explicit server updates with a second conflict check. Offline listening-time deltas are never replayed.

- Added an always-on-top mini-player with pinning, seeking, and shared playback controls, plus a restricted IPC allowlist for that window.

- Added MPV gapless preparation for adjacent music/local tracks, smart spoken rewind, named saved queues, and queue drag-and-drop.

- Added timestamped listening notes, book bookmark title editing, device listening statistics and daily goals.

- Added local rule playlists and credential-free Media Center JSON playlist import/export for the same Navidrome server.

- Added personal backup preview/restore with source matching, schema validation and transactional writes; no credential or media import.

- Added optional Discord presence with per-media privacy switches, reconnect, speed-aware progress and pause handling. Last.fm keys are encrypted; public album artwork is cached and can be corrected per track. Application setup remains optional.

- Refreshed icon controls and main buttons, preserved themes/fonts and focus visibility, bounded long queue/track/episode rendering, and added a short-lived catalog cache.

- Added offline/timeline/privacy/backup regressions and a native daily-use Electron smoke suite. Full Feishin/ABS parity, crossfade, automatic offline conflict resolution, M3U interoperability, and public book/podcast artwork remain future work.



## 0.2.3



- Added a dedicated `npm run release:preview` command so npm on Windows cannot swallow the preview flag and publish a version accidentally.

- Retains the in-app GitHub updater introduced in 0.2.2.



## 0.2.2



- Added Settings → App updates: check GitHub stable releases, download with progress, and restart to install.

- Download and installation are explicit actions; ordinary exit never installs. Playback sessions and queues are saved before installation.

- Added restricted update IPC, retryable errors, SHA-512 verification, corrupt-download and downgrade regression checks.

- GitHub releases now include verified updater metadata and remain drafts until every asset has uploaded.

- Version 0.2.1 and earlier need one manual installer upgrade to receive the in-app updater.



## 0.2.1



- Improved control contrast, readable text, larger buttons and visible seek/volume handles.

- Aligned playlist playback actions, grouped episode status/actions into readable cards, and improved small-window layouts.

- Fixed inherited scroll positions when opening details or changing screens, stale detail requests, and stretched queue action columns.

- Added version-tagged GitHub Actions Windows builds, packaged smoke checks, source archives, SHA-256 checksums, and release publication using GitHub CLI.

- Centralized the UI/server client version on package.json.



## 0.2.0



- Navidrome albums/songs/artists/favorites/genres/recent/most-played/radio views, playlists and track selection, ordered duplicates, favorites and ratings writes.

- Audiobookshelf Continue Listening, independent episode statuses, completion/reset, library and episode sorts/search, server book bookmarks.

- Local-folder browser, cached tags/formats, embedded artwork, native playback.

- Expanded player, editable persistent queue, Listen Later plans, device history, ReplayGain, ten-band EQ, themes and optional tray behavior.

- Preserved raw playback and whole-book seeking. Listening time excludes MPV buffering; manual status writes flush active playback first.

- GPL-3.0-only licensing, user/developer/security/API documentation and expanded regression/native integration checks.



## 0.1.0



First Windows desktop preview with separate music/book/podcast domains, encrypted connections, SQLite checkpoints, native MPV, covers, browsing and sample previews.
