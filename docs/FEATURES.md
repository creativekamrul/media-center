# Feature inventory

The target is a full desktop replacement for Feishin and Audiobookshelf's web client. **Full parity is not complete.** This inventory distinguishes working behavior from remaining work.

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

| Local music | Multiple selected roots; persistent recursive collection with nine tabs, source-specific favorites/playlists and library search; original Folders view; cached tags/format/size; lazy embedded artwork; native playback. See 0.7.3 limits below. |

| Player/queue | Cover opens expanded player and queue; seek/volume/speed/repeat/shuffle; insert/append/move/remove/jump/clear; restore queue after restart without autoplay |

| Personal | SQLite Listen Later dates, notes, rescheduling, completion/reopening/removal; recent device listening history |

| Audio | ReplayGain off/track/album; clipping prevention; ten-band EQ; per-book/episode speed; timed and chapter-end sleep |

| Appearance | 13 palettes including translucent Glass and Black Glass; visual theme picker with saved Solid / Gradient surfaces and optional translucent panels; consistent palette-aware cards, fields and dialogs; readable action buttons and keyboard focus; grouped episode controls; detail navigation resets scroll; reduced motion; adaptive layouts with 100/125/150/200% interface-scaling checks |

| Open source | GPL-3.0-only; user/developer/security/API documentation; model, provider, local-file, playback and desktop tests |

| Lyrics | On-demand LRCLIB for music/tagged local files; synced-line highlighting and seeking; plain/instrumental/missing states; cache and rate-limit handling. Manual search and persisted per-song bindings; enhanced-LRC karaoke in the 0.7.1 changes below. Local LRC/TXT import, embedded lyric extraction and per-song text/line timing editing are available in 0.9. |

| Updates | Settings check/download/restart-to-install; stable GitHub releases; verified download integrity; explicit user actions |

| Releases | Version-tagged GitHub Actions Windows builds; packaged integration checks; GitHub CLI publication; corresponding source and SHA-256 checksums |

Audiobookshelf search follows its relevance-ranked endpoint, capped at 100 matches; clear search for full server-sorted pagination. Continue Listening requests up to 100 recent server items. Podcast statuses belong to episodes, never to a synthesized book-like show.

## Daily-listening additions in 0.3

| Selected feature | Implemented scope |

|---|---|

| 1 — Discord Rich Presence | Optional own Application ID; local Windows IPC, reconnect, music/book/episode/local privacy switches, pause and speed-adjusted timestamps. Requires live Discord setup to verify a real profile. |

| 2 — Last.fm artwork | Encrypted user key; album lookup with track fallback; seven-day positive and one-hour negative cache; bounded responses; transient retries and manual refresh; separate artwork diagnostics; per-track artist/album correction; only public Last.fm CDN URLs. Books/podcasts use text-only presence. |

| 3 — Home | Server Continue Listening with equal-sized fluid cards, recent albums, newest unfinished indexed episodes, Listen Later plans. |

| 4 — Offline audio | Original music/book/episode files, sequential download queue, quota, pause/resume, bulk pause/resume, item/all selection and confirmed removal, cached covers, offline MPV, retained checkpoints, explicit conflict-checked position sync. Range and If-Range resume preserve partial bytes when the server supports validators; changed or unsupported representations restart safely. |

| 6 — Gapless | Prepares the next music/local track in MPV's internal playlist; waits for its file-loaded event; format changes may reopen the device. Optional shared-output music crossfade is available in 0.9. |

| 7 — Smart rewind | Configurable short/long rewind after 10 seconds / 5 minutes away; explicit chapter/seek positions remain exact. |

| 9 — Podcast inbox | Expanded show indexing, independent progress, title/show search, newest/oldest/show sorting, all/unfinished/in-progress/finished, bulk status writes and partial failure reporting. |

| 13 — Mini-player | Separate frameless always-on-top window, native pin state and persisted pin choice, cover, transport, seek, return to main window. |

| 14 — Saved queues | Named mixed/music/spoken sessions with index/position; load without autoplay, resume, replace, delete; drag-and-drop and keyboard-accessible arrow ordering. |

| 15 — Playlists | Local favorite/rating/genre/artist/year/unplayed rules; ordered results; same-server JSON import/export preserving duplicates. Navidrome smart playlists remain server managed. |

| 16 — Large collections | 30-second music-page cache, request deduplication, 100-row queue/track pages, 60-row episode pages, bounded show expansion, cached inbox with background refresh. |

| 17 — Notes/bookmarks | Timestamped searchable local notes for playable media; exact-position playback; note editing/deletion; server book bookmark title editing. |

| 18 — Listening habits | Device listening time on a fixed 30-day chart with date labels and zero-day slots, a recent-first daily table with optional quiet days and media totals, top listens, completion counts, configurable daily goal. Custom inclusive date-range recap with 12 layouts and 12 palettes, preview and 1080 × 1440 PNG export. No imported server history. |

| 20 — Personal backups | Native file export/preview, server/root matching, transactional replacement of preferences/queues/notes/plans/rules, strict validation; local playlists/favorites, lyric bindings and offsets, history, stats and daily-use preferences included; credentials, downloads and server progress excluded. |

The inbox indexes up to 100,000 episodes and displays refresh warnings rather than pretending a partial index is complete. Rule evaluation is capped at 100,000 tracks and 5,000 selected results. Downloads are capped at 1,000 entries, named queues at 100, and notes at 10,000. Initial inbox indexing requires expanded show requests and may take time.

## Remaining parity work

- Hardware-specific transition quality across unlike formats and a broader accessibility audit.

- Automatic offline reconciliation, broader reconnect/session recovery and token refresh. Resumable downloads and scoped podcast retention are implemented; full server-side retention management remains incomplete. Offline checkpoints require a preview and explicit position sync.

- Native Navidrome smart-playlist rule editor, server music-folder tree, advanced native filters, artist biographies/similar artists, album ratings, server-side playlist artwork uploads, Navidrome M3U/XSPF interoperability and radio management. Local M3U import/export and device-local playlist covers are implemented.

- Dedicated ABS author/collection management, server-side series editing, all personalized shelves/statistics, and complete podcast download/retention management parity.

- ABS metadata matching/editing, chapter/cover editors, supplementary files and ebook/PDF reading; library/user/server administration, scans, backups, logs, permissions and sharing.

- Complete accessibility audit, localization, code signing, macOS/Linux testing and packaging.

MPV is user-supplied. Hardware bit-perfect output and production server compatibility need testing on the actual device/server combination.

Research references: [Feishin](https://github.com/jeffvli/feishin), [Navidrome 0.60.3](https://github.com/navidrome/navidrome/tree/v0.60.3), [Audiobookshelf 2.35.1](https://github.com/advplyr/audiobookshelf/tree/v2.35.1). Upstream code informed the contract/feature audit; Feishin application source and artwork were not copied. See [API contracts](API-CONTRACTS.md).

## Immersive player (0.6.0)

- Optional large-lyrics playing screen with artwork/transport at upper right and a paginated, playable current queue below; classic layout stays available.

- Five background presets, adjustable lyric text, saved appearance, smooth following/background motion, and system reduced-motion support. No duplicate lyric panel.

- Spoken media retains explicit audiobook chapter vs. podcast episode behavior; no spoken-media lyric lookups.

- Main/mini scrubber supports first click, captured drag/release, keyboard changes, cancellation and track-change reset. Main-process seek guards include media identity and queue position.

- Does not include user-uploaded/video backgrounds, imported font files, or waveform visualization.

## Personalization (0.7.0)

- Manual LRCLIB search, preview, and persistent per-source/song lyric binding for music and local audio. Saved content bypasses automatic network lookups and cache expiry, including offline use. Clear/replace controls are in the lyrics panel. Search displays up to 20 results; no search pagination or LRCLIB upload is provided. Local lyric editing is available.

- Five optional color overrides and six system font choices for interface, headings, and lyrics. In-app preview, reset, persistence, validated preference backups, and live mini-player synchronization. Local CSS import is included in the 0.7.1 changes below; font file imports remain unsupported.

- Lyric bindings and timing offsets are included in personal backups; they are not synchronized to media servers.

## 0.7.1 settings and player polish

- MPV telemetry broadcasts are coalesced to one per 250 ms, with a guaranteed trailing snapshot; urgent state changes remain immediate.

- Settings have a sticky six-section navigation rail and theme-aware panels. Theme and audio saves share a complete preferences draft.

- Custom CSS import is local, UTF-8, and bounded to 512 KB. It supports preview, removal, mini-player synchronization, and validated backups.

- Lyrics support real enhanced-LRC word timing when available. Line-only records use presentation-only word estimates for Flow, or an approximate line sweep for other styles; cached or saved records without word data retain the fallback until refreshed or rebound.

- True fullscreen is available in the main window (F11/header toggle; Escape exits). Mini-player requests are rejected.

- Chapter seek markers, persistent seek thumbs, expanding volume, and consistent themed controls.

## 0.7.2 immersive appearance

- Settings navigation uses the same rounded buttons and active treatment as the app.

- Immersive lyrics: live-preview appearance popup, bounded persistent typography/colors/layout, word glow and lift, focus/fade/still modes, cancel/reset and older-preference migration. Real word timing remains dependent on the lyric record.

## 0.7.3 Home and local collection

- Normal and immersive lyric panels share the appearance popup and saved settings, including real word timing where available, estimated word-emphasis/line-sweep fallbacks, focus/centered growth/fade modes and reduced motion.

- Home offers horizontal shelves, a featured continuation, up-to-50-track favorites/recent/local-history mixes and a live device statistics widget. Mixes use existing collections/history, not recommendation models.

- Local music is a persistent indexed collection with nine tabs, source-scoped search/favorites/playlists, recursive tag scanning, paginated tracks, lazy covers and explicit rescans. The original folder browser remains available.

- Limits: 100 results and playable tracks per page; 50,000 indexed tracks / 5,000 folders / 100,000 entries per source. Local playlists support create/play/rename/reorder/remove/delete, M3U import/export and backup inclusion. Automatic folder watching follows unique file identities within a source; metadata editing remains unsupported. Local genres display the file's combined genre tags.

- Compact artwork across track lists, queues and listening records; lazy loading with bounded cover caches. Home offers conditional duration and artist mixes plus a bounded album sampler.

## 0.8 daily-use additions

- Track context menus, details, favorite and playlist actions; accessible through right-click or Shift+F10 on a focused track control.

- Global search groups Navidrome music, local tracks, Audiobookshelf books and indexed episodes by source. Results remain bounded; unavailable episode audio cannot be played.

- Home section order/visibility, playlist pins, mix visibility and previews with artist exclusions, track limits, shuffled regeneration and playlist saving. Cross-source mixes save as named queues.

- Compact density, configurable in-app shortcuts, optional music-only queue-end autoplay, per-song lyric timing offsets and Windows SMTC metadata/artwork/transport integration.

- Per-show automatic offline downloads check every ten minutes. They use episodes already downloaded on Audiobookshelf; retention cleans only copies owned by the rule and preserves the playing episode and manual downloads.

- Scoped cache, personal-data and full application reset with native confirmation; no original local media or server-side content is removed.

Limits: local watching requires an available source; identity matching is strongest on NTFS and does not infer moves between different roots. Autoplay selects up to 20 unqueued tracks from the same source; it does not invent recommendations. Metadata/track identity remains explicit for each media type.

## Library tools and Recap (included in 1.0)

| Feature | Working scope and limits |

|---|---|

| Command palette | Ctrl+Shift+P; filter navigation/library, theme, playback, timer, undo and diagnostics commands; keyboard navigation. |

| Undo | Last 20 queue, playlist and favorite edits in the running session. A snapshot guard refuses to overwrite newer edits. Restoring removed queue entries preserves the currently playing item when it remains in the restored queue. Reset/backup restore clears the journal. |

| Listening profiles | Up to 30 named snapshots of saved theme/appearance, lyrics, volume, EQ and spoken speed. Capture saved settings before creating a profile; profiles and output memory are included in validated personal backups. |

| Output memory | Remember volume and EQ for an MPV device identifier. Restored when that output is selected; device changes take effect on the next playback start. |

| Lyric editing | Native UTF-8 LRC/TXT picker up to 200 KB; embedded tags from canonical local music paths; per-song text/timestamp editor. Existing enhanced timing survives unchanged edits; timing a line converts that line to line timing. MPEG-frame-based embedded timestamps fall back to plain text instead of guessed timing. |

| Playlist covers | Grid or stacked-record collage, PNG/JPEG import, title/color/size controls, PNG export. Covers are device-local overrides (up to 100), not server uploads, and are not included in personal backups. |

| Library health | Read-only rescan/report for missing artwork/tags, unavailable indexed files and likely duplicates. Similar title/artist/duration is a review hint, not proof of identical audio. Existing local index bounds apply; at most 10,000 issues displayed. |

| Rediscovery | Forgotten server/local favorites, older artists from retained history and unfinished server albums, with reasons. No invented recommendations or external recommendation service. Retained device history is limited to 500 items. |

| Series | Audiobookshelf book-library series identity/order, completed counts and next unfinished book; up to 10,020 books per library with a visible limit warning. No server-side series metadata editing. |

| Podcast subscriptions | Audiobookshelf 2.35.1 server search, RSS preview, reviewed OPML import/export and up to 100 selected subscriptions per request. Server management permission required; background subscription requests disable automatic audio download. |

| Crossfade | Optional 0–12 second shared-output MPV music/local-music overlap. Album neighbors can retain gapless playback. Disabled for exclusive output, spoken media, radio and repeat-one; transitions at the queue-end repeat wrap use the existing normal path. Format/hardware transition quality needs listening verification. |

| Recovery / diagnostics | Connection checks/retry, current-playback retry, link to offline checkpoint review. Exported JSON contains allowlisted technical state, not paths, addresses, credentials, track/source names or raw errors. |

| Recap | Spotlight, Festival ticket, Editorial, Record sleeve, Control room, Day by day, Orbit, Mixtape, The Listening Post, Signal map, Color blocks and Gallery wall. 12 separate palettes; custom title; 7/30/90/365-day presets or custom dates. Totals, rankings, media mix, activity/streaks, busiest day, averages and previous-period artist comparison. Different designs emphasize different metrics. Heatmap caps at the first 364 days (clearly labeled); totals use the complete range. Data comes from device listening, not imported server history. |


## 1.0 release polish

- Settings search indexes labels and section topics, never entered credentials or values. Search results reveal, focus and highlight a setting while preserving mounted preference drafts.
- Consistent focus indicators, wrapped action groups and responsive Settings/player/modal layouts. Automated Chromium interface-zoom checks cover 100%, 125%, 150% and 200%; actual Windows monitor/DPI combinations still benefit from user testing.
- Home, server libraries and the local collection distinguish loading, empty and failed requests. Connection retries preserve existing views during successful refreshes; missing-source screens link to setup.
- What's new opens once for each app version, persists dismissal locally and can be reopened from Updates. Feature links navigate within the app; the changelog opens a fixed GitHub URL from the main process. Mini-player IPC cannot invoke this route.

## 1.0.1 window polish

- Main-window-only validated controls for minimize, maximize/restore and close; native close/tray lifecycle preserved.
- Theme-aware frameless title bar with a native draggable area and explicit non-draggable controls. Fullscreen hides the title bar and restores it on exit.
- Classic Now Playing uses a compact, wrapping header for Back to library and Queue/Lyrics/Immersive navigation.
