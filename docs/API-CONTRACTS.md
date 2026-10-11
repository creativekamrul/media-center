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

## Original downloads and the cross-show inbox

Verified against Audiobookshelf **v2.35.1**: expanded book `media.tracks` contains ordered included physical files with `ino`, duration and startOffset. Episode audio is `media.episodes[].audioFile`, selected by exact episode ID. Downloads use `/api/items/:id/file/:fileid/download` so the server's download permission check applies; the item file route without `/download` is not substituted. The download worker never creates a listening session merely to download a file.

The v2.35.1 `/api/libraries/:id/recent-episodes` endpoint excludes finished episodes. It cannot implement an All/Finished inbox. Media Center instead pages explicit podcast libraries, fetches expanded shows, and maps `/api/me` progress by `[libraryItemId, episodeId]`. This avoids silently losing finished episodes or conflating minified shows with books.

Navidrome **0.60.3** downloads use the Subsonic `download` endpoint. Network playback retains `stream` with raw format and zero requested bitrate. JSON playlist exports contain IDs and descriptive metadata, not authenticated playback links.

Offline spoken checkpoint writes use the same exact book/episode progress endpoint as status writes, with `currentTime`, `duration`, `progress` and `isFinished`. They follow an explicit preview and second server-state check. They do not synthesize listening sessions or historical listening-time deltas.

Sources: [ABS 2.35.1 API router](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/routers/ApiRouter.js), [Book model](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/models/Book.js), [podcast query helpers](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/utils/queries/libraryItemsPodcastFilters.js).


## LRCLIB manual matching (0.7.0)

Use the [official LRCLIB API](https://lrclib.net/docs): GET `/api/search?q=...` returns candidate records, and GET `/api/get/{id}` retrieves the selected record. Requests remain in Electron main, use the app User-Agent, reject redirects, share a sequential queue with 250 ms spacing, and honor Retry-After. Search responses are bounded to 4 MiB and 20 displayed results; individual records to 512 KiB. Text is rendered as text, never HTML.

A saved match uses a SHA-256 key derived from the complete source/media identity and stores the validated record's content in SQLite's durable key/value table, separate from the expiring/evictable automatic lyric cache. Bind operations verify the current music/local target before fetching and again before writing. Stored content is returned before asking a media provider for metadata. Removing a binding restores automatic matching. Bindings do not sync to a server or enter personal backup exports.


## Jellyfin 10.11.11

Verified against version-tagged controllers under https://github.com/jellyfin/jellyfin/tree/v10.11.11/Jellyfin.Api/Controllers . Authentication uses Users/AuthenticateByName and X-Emby-Authorization with a persistent device ID. Libraries use Users/{userId}/Views and explicit CollectionType. Items use explicit Type (Audio, MusicAlbum, MusicArtist, Playlist, Movie, Series, Season, Episode); unknown types fail.

POST Items/{id}/PlaybackInfo supplies a native MPV DeviceProfile, EnableDirectPlay=true, EnableDirectStream=false, EnableTranscoding=false and AutoOpenLiveStream=false. Only a finite source with SupportsDirectPlay and no RequiresOpening is accepted. MPV receives a random loopback capability URL; the main process relays Audio/{id}/stream or Videos/{id}/stream with Static=true and MediaSourceId. Server-provided arbitrary playback paths are never opened. Fetch redirects are rejected and byte ranges/content ranges are preserved. External subtitle paths are constructed only from validated source subtitle metadata and approved text formats.

Sessions/Playing, Sessions/Playing/Progress and Sessions/Playing/Stopped report item/source/session identity and whole-item PositionTicks (10,000,000 ticks per second), PlayMethod=DirectPlay. No Audiobookshelf chapter/file conversion is reused for Jellyfin. Unit and native fixture tests include reverse proxy paths, original stream ranges, explicit media kinds, 125-item duplicate playlists, resume precedence, failed sync and episode advance.

Windows video is hosted by a native child HWND under the Electron window. Only main supplies the parent handle and MPV --wid argument. The renderer bridge accepts bounded video rectangles/visibility, never arbitrary handles or MPV commands. Fullscreen targets the Electron window; leaving the video view hides the child and exits fullscreen.

Jellyfin artwork uses the 10.11.11 `GET Items/{itemId}/Images/{imageType}` contract, restricted to Primary and Backdrop through validated IPC. Backdrops request maxWidth=1600; credentials remain in the main process and cache keys include server, image type and item. Reference: https://github.com/jellyfin/jellyfin/blob/v10.11.11/Jellyfin.Api/Controllers/ImageController.cs

Detail metadata follows Jellyfin 10.11.11 BaseItemDto (People, Studios, CommunityRating, OfficialRating and ParentLogoItemId). Similar titles use GET Items/{itemId}/Similar with UserId and Limit=12; series continuation uses GET Shows/NextUp with UserId, SeriesId and Limit=1. Logo joins Primary and Backdrop in the validated image-type allowlist.


### v2 desktop presentation and video controls

Global search groups carry stable IDs separate from display names, so identically named sources remain distinct. Jellyfin discovery/search uses the existing validated browse API; no renderer fetch or authenticated URL access is added. Home/search results retain their server/library identity.

Video preferences and queue selection are validated in shared/jellyfin.ts and executed in main. Subtitle size is bounded to 0.5–2; countdown is 0, 5 or 10 seconds; language values are constrained language codes. The native player resets track IDs for each file. Settings use MPV's documented sub-scale, sub-back-color, alang and slang options (https://mpv.io/manual/stable/). No arbitrary MPV command is exposed.

The pointer-active bridge returns only a boolean describing movement inside the visible app while the owned video surface is active. Coordinates stay in main. The renderer uses this to reveal fullscreen chrome over the separate native child surface, then resizes that surface into the reserved video area. It does not attempt to draw HTML over native MPV pixels.

Diagnostics export only Jellyfin status, media kind, queue length, buffering/fullscreen flags, error-presence flags and audio/subtitle counts. No track names, server identities, paths, URLs or error strings are included.
