# Feature inventory — 0.2

The target is a full desktop replacement for Feishin and Audiobookshelf's web client, with lyrics deliberately excluded. **0.2 is a substantial daily-listening release, not a claim of full parity.** This inventory distinguishes working behavior from remaining work.

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
| Bookmarks | Add/list/jump/delete Audiobookshelf book bookmarks |
| Podcasts | Show libraries and independent episodes; title/description/filename search; date/title/season/episode/filename/duration/progress sort; ascending/descending; downloaded-only filter |
| Status | Finished/unfinished/in-progress/not-started filters; exact-item finished/unfinished/reset writes; Continue Listening books and episodes |
| Server tracking | Navidrome now-playing/completion scrobbles; ABS sessions, periodic progress, pause/seek/exit flush; visible failures and local checkpoints |
| Local files | Multiple selected roots; original folder tree; current-folder search/sort; cached tags/format/size; embedded artwork; native playback |
| Player/queue | Cover opens expanded player and queue; seek/volume/speed/repeat/shuffle; insert/append/move/remove/jump/clear; restore queue after restart without autoplay |
| Personal | SQLite Listen Later dates, notes, rescheduling, completion/reopening/removal; recent device listening history |
| Audio | ReplayGain off/track/album; clipping prevention; ten-band EQ; per-book/episode speed; timed and chapter-end sleep |
| Appearance | Forest/charcoal; readable action buttons and keyboard focus; grouped episode controls; detail navigation resets scroll; reduced motion; minimum 1024 × 720 layout |
| Open source | GPL-3.0-only; user/developer/security/API documentation; model, provider, local-file, playback and desktop tests |
| Releases | Version-tagged GitHub Actions Windows builds; packaged integration checks; GitHub CLI publication; corresponding source and SHA-256 checksums |

Audiobookshelf search follows its relevance-ranked endpoint, capped at 100 matches; clear search for full server-sorted pagination. Continue Listening requests up to 100 recent server items. Podcast statuses belong to episodes, never to a synthesized book-like show.

## Remaining parity work

- Gapless preloading, crossfade, smart rewind, independent saved queues, drag-and-drop ordering, customizable shortcuts, Windows media-session integration, mini-player.
- Offline downloads/quotas/retention, durable reconnect and sync conflict recovery, token refresh. Local checkpoints are not replayed over authoritative server progress automatically.
- Native Navidrome smart-playlist rule editor, server music-folder tree, advanced native filters, artist biographies/similar artists, album ratings, playlist artwork/import/export, radio management, custom CSS.
- Dedicated ABS author/series/collection pages and management, all personalized shelves/statistics, batch episode status changes, bookmark editing, cross-show latest/unplayed feed, podcast discovery/subscription/RSS import and download/retention management.
- ABS metadata matching/editing, chapter/cover editors, supplementary files and ebook/PDF reading; library/user/server administration, scans, backups, logs, permissions and sharing.
- Complete accessibility audit, localization, code signing, automatic updates, macOS/Linux testing and packaging.

Lyrics are intentionally excluded. MPV is user-supplied. Hardware bit-perfect output and production server compatibility need testing on the actual device/server combination.

Research references: [Feishin](https://github.com/jeffvli/feishin), [Navidrome 0.60.3](https://github.com/navidrome/navidrome/tree/v0.60.3), [Audiobookshelf 2.35.1](https://github.com/advplyr/audiobookshelf/tree/v2.35.1). Upstream code informed the contract/feature audit; Feishin application source and artwork were not copied. See [API contracts](API-CONTRACTS.md).
