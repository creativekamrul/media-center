# API contracts

## Navidrome 0.60.3

Subsonic/OpenSubsonic uses a per-request salt and password token. Mutation arrays use POST form bodies. No plaintext password is included in a URL.

- Browse: getMusicFolders, getAlbumList2, getAlbum, getSong, getArtists, getArtist, search3, getGenres, getSongsByGenre, getStarred2.
- Write: star/unstar with entity-specific IDs; setRating for songs.
- Playlists: getPlaylists/getPlaylist/createPlaylist/updatePlaylist/deletePlaylist. Membership replacement sends ordered repeated songId fields, including duplicates. Metadata is a separate operation; partial failures are surfaced. Read-only playlists reject edits.
- Playback: stream with format=raw and maxBitRate=0. Scrobble submission=false for now playing, true after half the duration or 240 seconds actually listened, whichever is earlier.
- Radio: getInternetRadioStations; stream URLs remain in main.

Sources: [versioned playlists](https://github.com/navidrome/navidrome/blob/v0.60.3/server/subsonic/playlists.go), [versioned search](https://github.com/navidrome/navidrome/blob/v0.60.3/server/subsonic/searching.go), [OpenSubsonic playlist replacement](https://opensubsonic.netlify.app/docs/endpoints/createplaylist/), [original stream](https://opensubsonic.netlify.app/docs/endpoints/stream/).

## Audiobookshelf 2.35.1

Bearer credentials are headers. Explicit mediaType discriminates libraries/items. Book targets contain bookId; episode targets contain both showId and episodeId. Local and radio targets are excluded from SpokenTarget.

| Operation | Route/behavior |
|---|---|
| Progress/bookmarks | GET /api/me; mediaProgress and bookmarks arrays |
| Paging/sort | GET /api/libraries/:id/items; limit=60, page, sort, desc, minified |
| Book status filter | filter=progress.base64(value); not-started, in-progress, not-finished, finished |
| Search | GET /api/libraries/:id/search?q=...&limit=100; relevance-ranked |
| Detail | GET /api/items/:id?expanded=1&include=progress |
| Continue Listening | GET /api/me/items-in-progress?limit=100; podcast rows carry recentEpisode |
| Book play | POST /api/items/:bookId/play |
| Episode play | POST /api/items/:showId/play/:episodeId |
| Progress sync | POST /api/session/:id/sync or /close with currentTime, duration, timeListened |
| Manual status | PATCH /api/me/progress/:bookId or /:showId/:episodeId; text success accepted |
| Bookmarks | POST/PATCH /api/me/item/:bookId/bookmark; DELETE adds /:time |

Direct sessions require playMethod=0. Physical track startOffset converts MPV file seconds to whole-book seconds. Resume uses server currentTime. Listening time uses playing wall time excluding buffering, not seek distance or speed-adjusted media positions.

Sources: [MeController](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/controllers/MeController.js), [User](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/models/User.js), [library sorts](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/client/components/controls/LibrarySortSelect.vue), [episode table](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/client/components/tables/podcast/LazyEpisodesTable.vue), [book filters](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/utils/queries/libraryItemsBookFilters.js).

The old ABS API reference is unmaintained; version-tagged code takes precedence. Fixtures are representative synthetic payloads, not private exports. Fixture success is not proof of production compatibility.
