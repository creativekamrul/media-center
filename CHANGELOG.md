# Changelog

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
