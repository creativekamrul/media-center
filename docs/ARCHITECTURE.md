# Architecture decision: Windows desktop with MPV

Accepted stack: Electron + React + TypeScript; SQLite for local persistent state; external MPV controlled over a local named pipe. No hosted frontend, browser audio player, or additional server is required.

## Boundaries

`src/renderer` owns presentation and interaction. It calls an explicit `DesktopAPI` through the sandboxed preload. Node integration is disabled, context isolation is enabled, permissions are denied by default, and navigation/new windows are blocked.

`src/main` owns credentials, network calls, SQLite, native dialogs, MPV lifecycle, playback coordination, and server synchronization. Each IPC handler validates its sender and input schema. The renderer cannot run arbitrary shell/MPV commands, read arbitrary files, or supply playback URLs.

`src/main/providers` translates each server's responses into domain entities. Runtime schemas validate discriminator fields. Unknown media types fail explicitly; they are never treated as books by default.

`src/shared` contains domain types and timeline calculations. No credential or stream URL belongs in these public types.

## Three distinct domains

```text
Navidrome connection
  Music library
    Album
      Music track (playable)

Audiobookshelf connection
  Book library (mediaType: book)
    Audiobook (playable)
      Chapter (whole-book start/end markers)
      Audio file (physical file, start offset, duration)

  Podcast library (mediaType: podcast)
    Podcast show (container, not playable)
      Podcast episode (playable, independent ID and progress)
```

A chapter can span multiple physical files. A file can contain multiple chapters. The application must never pair chapters and files by array index. A minified podcast show may omit its episodes; this does not change its media kind. Fetch expanded item detail before showing episodes.

Episode playback requires both show ID and episode ID. Book playback uses the item ID alone. No generic `playItem(id)` interface is permitted.

## Playback and persistence

The app holds one persistent MPV process. It starts with its own configuration, no terminal/video window, bounded read-ahead, and a unique local pipe. MPV replies are correlated by request ID; timeouts and process exit reject pending requests. Authenticated URLs are passed through IPC rather than process arguments.

Playback actions are serialized so track switches, seeks, and progress flushes cannot concurrently replace sessions. Audiobookshelf session positions are converted between whole-book seconds and MPV file-relative seconds. Books and podcast episodes use different endpoint constructors and progress keys.

Progress is checkpointed locally every five seconds and synchronized every fifteen seconds, on pause/seek, before replacement, and on clean exit. Failed syncs remain visible. Listening duration uses wall-clock time while playing, not media-position deltas; seeks do not count as listening. Uncertain listening-time deltas are not blindly retried. Downloaded spoken audio uses a separate offline checkpoint and an explicit preview/commit workflow that checks server progress again before writing. Uncertain listening-time deltas are never uploaded.

Music speed resets to 1.0 when switching from spoken audio. Spoken speed is stored per book/episode. One mixed active queue is persisted and restored without autoplay. Queue edits preserve the current item and session. Shuffle changes the visible upcoming order rather than choosing a random next item repeatedly. Named saved queues retain their own items, index and position and can be loaded without autoplay or explicitly resumed.

## Local files and personal storage

`src/main/local.ts` records native-picker-approved roots in SQLite. Every path is resolved and checked for containment, including canonical symlink/junction targets. Browsing is nonrecursive and read-only. Audio metadata is parsed with bounded concurrency and cached by root/relative path plus modification time and size. Embedded artwork is loaded separately; no complete high-resolution audio buffer is sent to the renderer.

`PlayTarget` also discriminates local files (root ID plus relative file ID) and radio (server plus station ID). `SpokenTarget` positively selects only books and episodes; never infer spoken audio by excluding music.

SQLite stores versioned feature state in the existing key/value table: local roots, metadata cache, queue, listening plans, recent history, audio preferences, resume checkpoints, and device identity. Additive storage preserves existing encrypted connections. Plans do not modify server completion flags or create background notifications.

`features.ts` owns validated feature IPC registration; the provider adapters own server contracts. Dedicated MusicBrowser, SpokenBrowser, and ListeningSpace components keep those UI domains separate. Audiobook progress is mapped by item ID; episode progress includes both parent and episode IDs. Manual active-item status writes stop and close its session before updating the server.

Audio preferences are applied through a fixed MPV command list. EQ frequencies are fixed and gain values validated. There is no arbitrary command/filter input. Optional processing defaults off. Listening-time accumulation excludes MPV cache buffering. Native tray controls use the same serialized player methods as the UI.

## Compatibility evidence

- [Navidrome Subsonic compatibility](https://www.navidrome.org/docs/developers/subsonic-api/)
- [OpenSubsonic original stream contract](https://opensubsonic.netlify.app/docs/endpoints/stream/)
- [Audiobookshelf 2.35.1 item controller](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/controllers/LibraryItemController.js)
- [Audiobookshelf 2.35.1 API router](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/routers/ApiRouter.js)
- [MPV command and IPC manual](https://mpv.io/manual/stable/)
- [Electron security recommendations](https://www.electronjs.org/docs/latest/tutorial/security)

The old Audiobookshelf API reference is explicitly unmaintained. Version-tagged server code takes precedence when it disagrees with the reference. Regression fixtures are handwritten representative payloads; capture redacted real-server fixtures before claiming live compatibility.

## Daily listening (0.3)

`daily.ts` validates personal feature requests and native file import/export. Backups are limited to 25 MB, runtime-schema validated, matched to already configured source identities, and restored transactionally. They cannot create filesystem roots, executable paths or credentials. Podcast inbox indexing discriminates library media type, fetches expanded shows in batches of four, and attaches a single per-server progress snapshot by show/episode identity. The index cache is persisted; failed refreshes are reported instead of replacing a complete cache with partial data.

`downloads.ts` owns a UUID-only directory beneath userData. Original audio is streamed through a byte meter and `.part` file with abort/quota checks; completed files are renamed only after length validation. Public download snapshots exclude paths and authenticated URLs. A separate bounded cover cache avoids rewriting image data with each download progress update. Ready playback validates canonical containment and file length. Books use ordered expanded `media.tracks` (physical files); chapters remain independent. Podcast targets resolve one episode's `audioFile.ino`. Download URLs enforce Audiobookshelf download permission. Shutdown waits for the worker before closing SQLite.

The player loads cached files using the same whole-item timeline conversion as network sessions. Offline checkpoints are retained separately from online resume. A manual sync preview stops the active item, reads the latest server state, and issues a short-lived token. Commit rereads that state and refuses a changed position/update timestamp before patching absolute progress.

Gapless music uses MPV's internal append playlist and `gapless-audio=weak`, preserving original format rather than forcing conversion. Staged entries carry MPV playlist IDs; state advances only after their `start-file`/`file-loaded` events. Queue changes invalidate preparation. File-relative updates are suppressed across transitions. Network/device constraints can still create gaps; no crossfade is implemented.

The mini-player is a separate sandboxed BrowserWindow with the same restricted preload. Main-process sender validation limits it to playback state/commands, artwork, appearance and mini-window controls; server settings and personal-data IPC are rejected. Both windows receive the same serialized playback state.

SQLite adds device listening-time aggregation and a bounded catalog cache. Wall-clock listening excludes pause/buffering, groups by local calendar date and explicit media kind, and records completion separately from listening seconds. Long track/queue lists render bounded pages. Music browse requests are deduplicated and cached briefly; library refresh and mutations invalidate cached data.

`discord.ts` implements the documented Windows IPC framing and handshake, bounds incoming frames, handles ping/pong, tracks acknowledgements and reconnects. Presence is off until configured. Each media kind has a privacy switch. Last.fm requests and encrypted keys stay in main; only allowlisted public Last.fm CDN URLs can enter presence payloads. Artwork lookups recheck current target/privacy before publishing and never upload private covers. No bot or user token, arbitrary RPC command, or chat capability is exposed.

Protocol references: [Discord RPC](https://docs.discord.com/developers/topics/rpc), [Discord IPC notes](https://github.com/discord/discord-rpc/blob/master/documentation/hard-mode.md), [Last.fm album.getInfo](https://www.last.fm/api/show/album.getInfo), [MPV manual](https://mpv.io/manual/stable/).
