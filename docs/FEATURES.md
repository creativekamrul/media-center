# Feature inventory — 0.3

The target is a full desktop replacement for Feishin and Audiobookshelf's web client, with lyrics deliberately excluded. **0.3 expands daily listening; it does not claim full parity.** This inventory distinguishes working behavior from remaining work.

## Available

| Area | Working behavior |
|---|---|
| Desktop | Windows installer; external MPV picker; output devices; exclusive output; media keys; optional close to tray |
| Music | Libraries, albums, songs, artists and artist albums, recently added/played, most played, random albums, genres, favorites, radio playback |
| Search/order | Songs/artists/albums search, paginated catalog, album title/artist/year/rating ordering, playlist/artist/genre/favorite search |
| Library changes | Favorite/unfavorite songs, albums, artists; song ratings |
| Playlists | List/create/rename/describe/public/private/delete; play; add/remove/reorder tracks; preserve duplicates; respect server read-only flags |
| Selection | Select tracks/all shown; play; play next; append queue; add to playlist; plan later |
| Books | Separate book libraries; details, author/narrator/series metadata; standard book-library sorts; status filters; chapters distinct from files; whole-book resume and cross-file seeks |
| Bookmarks | Add/list/jump/edit title/delete Audiobookshelf book bookmarks |
| Podcasts | Show libraries and independent episodes; title/description/filename search; date/title/season/episode/filename/duration/progress sort; ascending/descending; downloaded-only filter |
| Status | Finished/unfinished/in-progress/not-started filters; exact-item finished/unfinished/reset writes; Continue Listening books and episodes |
| Server tracking | Navidrome now-playing/completion scrobbles; ABS sessions, periodic progress, pause/seek/exit flush; visible failures and local checkpoints |
| Local files | Multiple selected roots; original folder tree; current-folder search/sort; cached tags/format/size; embedded artwork; native playback |
| Player/queue | Cover opens expanded player and queue; seek/volume/speed/repeat/shuffle; insert/append/move/remove/jump/clear; restore queue after restart without autoplay |
| Personal | SQLite Listen Later dates, notes, rescheduling, completion/reopening/removal; recent device listening history |
| Audio | ReplayGain off/track/album; clipping prevention; ten-band EQ; per-book/episode speed; timed and chapter-end sleep |
| Appearance | Forest/charcoal; readable action buttons and keyboard focus; grouped episode controls; detail navigation resets scroll; reduced motion; minimum 1024 × 720 layout |
| Open source | GPL-3.0-only; user/developer/security/API documentation; model, provider, local-file, playback and desktop tests |
| Updates | Settings check/download/restart-to-install; stable GitHub releases; verified download integrity; explicit user actions |
| Releases | Version-tagged GitHub Actions Windows builds; packaged integration checks; GitHub CLI publication; corresponding source and SHA-256 checksums |

Audiobookshelf search follows its relevance-ranked endpoint, capped at 100 matches; clear search for full server-sorted pagination. Continue Listening requests up to 100 recent server items. Podcast statuses belong to episodes, never to a synthesized book-like show.

## Daily-listening additions in 0.3

| Selected feature | Implemented scope |
|---|---|
| 1 — Discord Rich Presence | Optional own Application ID; local Windows IPC, reconnect, music/book/episode/local privacy switches, pause and speed-adjusted timestamps. Requires live Discord setup to verify a real profile. |
| 2 — Last.fm artwork | Encrypted user key; album lookup; seven-day positive and one-hour negative cache; per-track artist/album correction; only public Last.fm CDN URLs. Books/podcasts use text-only presence. |
| 3 — Home | Server Continue Listening, recent albums, newest unfinished indexed episodes, Listen Later plans. |
| 4 — Offline audio | Original music/book/episode files, sequential download queue, quota, pause/resume, bulk pause/resume, item/all selection and confirmed removal, cached covers, offline MPV, retained checkpoints, explicit conflict-checked position sync. Retries restart partial downloads. |
| 6 — Gapless | Prepares the next music/local track in MPV's internal playlist; waits for its file-loaded event; format changes may reopen the device. Crossfade is not included. |
| 7 — Smart rewind | Configurable short/long rewind after 10 seconds / 5 minutes away; explicit chapter/seek positions remain exact. |
| 9 — Podcast inbox | Expanded show indexing, independent progress, title/show search, newest/oldest/show sorting, all/unfinished/in-progress/finished, bulk status writes and partial failure reporting. |
| 13 — Mini-player | Separate frameless always-on-top window, pin toggle, cover, transport, seek, return to main window. |
| 14 — Saved queues | Named mixed/music/spoken sessions with index/position; load without autoplay, resume, replace, delete; drag-and-drop and keyboard-accessible arrow ordering. |
| 15 — Playlists | Local favorite/rating/genre/artist/year/unplayed rules; ordered results; same-server JSON import/export preserving duplicates. Navidrome smart playlists remain server managed. |
| 16 — Large collections | 30-second music-page cache, request deduplication, 100-row queue/track pages, 60-row episode pages, bounded show expansion, cached inbox with background refresh. |
| 17 — Notes/bookmarks | Timestamped searchable local notes for playable media; exact-position playback; note editing/deletion; server book bookmark title editing. |
| 18 — Listening habits | Device listening time on a fixed 30-day chart with date labels and zero-day slots, by day/media kind, top listens, completion counts, configurable daily goal. No imported server history. |
| 20 — Personal backups | Native file export/preview, server/root matching, transactional replacement of preferences/queues/notes/plans/rules, strict validation; credentials, downloads, statistics and server progress excluded. |

The inbox indexes up to 100,000 episodes and displays refresh warnings rather than pretending a partial index is complete. Rule evaluation is capped at 100,000 tracks and 5,000 selected results. Downloads are capped at 1,000 entries, named queues at 100, and notes at 10,000. Initial inbox indexing requires expanded show requests and may take time.

## Remaining parity work

- Crossfade, customizable shortcuts, Windows media-session integration, continuous transitions across unlike audio formats, broader accessibility audit.
- Automatic download retention, resumable byte-range downloads, automatic offline reconciliation, durable reconnect/session recovery, token refresh. Offline checkpoints require a preview and explicit position sync.
- Native Navidrome smart-playlist rule editor, server music-folder tree, advanced native filters, artist biographies/similar artists, album ratings, playlist artwork and interoperable M3U/XSPF import/export, radio management, custom CSS.
- Dedicated ABS author/series/collection pages and management, all personalized shelves/statistics, podcast discovery/subscription/RSS import and download/retention management.
- ABS metadata matching/editing, chapter/cover editors, supplementary files and ebook/PDF reading; library/user/server administration, scans, backups, logs, permissions and sharing.
- Complete accessibility audit, localization, code signing, macOS/Linux testing and packaging.

Lyrics are intentionally excluded. MPV is user-supplied. Hardware bit-perfect output and production server compatibility need testing on the actual device/server combination.

Research references: [Feishin](https://github.com/jeffvli/feishin), [Navidrome 0.60.3](https://github.com/navidrome/navidrome/tree/v0.60.3), [Audiobookshelf 2.35.1](https://github.com/advplyr/audiobookshelf/tree/v2.35.1). Upstream code informed the contract/feature audit; Feishin application source and artwork were not copied. See [API contracts](API-CONTRACTS.md).
