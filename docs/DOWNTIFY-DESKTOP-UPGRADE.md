# Downtify desktop 2.3.1

Scope authorized November 22, 2026: desktop only; retain existing server accounts, media cache, settings and listening references. Mobile is deferred. The local candidate was built and verified first. GitHub publication was explicitly authorized on November 22, 2026 after local acceptance checks. The initial 2.3.0 workflow stopped on an outdated release-screen test before publication; 2.3.1 corrects that validation without moving the original tag.

## Implemented scope

| Area | Desktop behavior |
| --- | --- |
| API foundation | Product/API/server identity checks, capabilities, existing web-session compatibility, optional device sign-in/pairing, stable-ID aliases, cursor/ETag catalogs, atomic updates and ticketed change notifications. Central search and Explore reuse the client. |
| Playlists | Create/rename, manual ordering, repeated occurrences, remove one occurrence, shared song-editor rights, follow/unfollow, imported-song hide/restore and owner sharing controls. Server artwork and bounded rows are retained. Stale membership/permissions reject an edit before sending it where possible; uncertain writes are never automatically replayed. |
| Charts | Track, album, artist and playlist shelves with chart playlist cards opening Deezer, matching the upstream summary-only contract. Browsing never requests a permanent download. |
| Monitor and Wanted | Artist/playlist watches, release types and future-only rules, pause/resume/stop and interval changes, inventory, release choices, missing releases and Wanted job controls. |
| Podcasts | Search/resolve/subscribe, feed intervals and retention, keep-files unsubscribe, explicit server downloads, saved-episode native playback, per-episode progress, played state and local/server resume choices. |
| Lyrics and likes | Saved/custom lyric bindings retain priority, then Downtify timed/plain lyrics, then LRCLIB. Podcast text is excluded. Server likes use stable IDs and idempotent requests. |
| Metadata | Selected-field batch editing, revision checks and per-track results. No atomic batch-success claim. |
| Audio replacement | Server candidates, explicit queue requests and a native audio picker with file-type/size checks, confirmation and streamed uploads. |
| Library care | Web-admin Doctor scans, selected playlist/duplicate/Navidrome/Soulseek repairs and selective artwork/lyrics/metadata upgrade jobs with progress/pause/resume/cancel. |

## Preservation and boundaries

- No account IDs, preferences, media cache, original files, existing queues or history are cleared or rewritten. A legacy local track ID is reused when its existing record matches the first stable-ID sync; subsequent renames keep that mapping. No IDs are guessed between different accounts/servers.
- Catalog rows, aliases and cursor commit together. Malformed/error responses retain the prior catalog; retired records remain available for old history references. Existing local cache is not used as a server-cleanup target.
- Modern controls require compatible APIs/capabilities. Existing 3.9 browsing/streaming routes remain available on older servers. The adapter is pinned to upstream **3.13.0**, not an assertion of compatibility with every later release.
- Device tokens cannot administer the server. Existing web-session connections are retained; switching sign-in method is explicit. Credentials stay in the main process and encrypted storage. MPV gets a short-lived loopback capability.
- Download/watch/retention/replacement/repair actions are explicit user operations. Unsubscribe always sets `keep_files=true`. Cleanup never submits an empty selection that the server could interpret as all files. Upgrade categories are checked against the current advertised list.
- The v1 contract has no whole-playlist delete route. A podcast must be downloaded on Downtify before playback; an undocumented enclosure stream is not invented. Server-saved audio and a desktop offline copy are separate concepts; this work does not claim new desktop Downtify offline caching.

## Verification

- `npm test`: **332 tests in 52 files passed**, including retained Audiobookshelf books/episodes, modern/legacy Downtify, stable IDs, stale/revoked playlist edits, uncertain writes, atomic rollback, ticketed WebSocket invalidation, private listening/outbox behavior, metadata partial failures and pending podcast progress recovery.
- Type checking and production build passed. Real Electron with muted native MPV exercised stable-ID playback/seek, server lyrics, playlist order/sharing, metadata edits, search identities, likes, replacement candidates/native uploads, Charts, Monitor, podcast playback/progress and maintenance controls.
- The modern end-to-end run passed through `postman/simulations/downtify-desktop-313.sim.yaml`; its NDJSON records actual requests to the source-derived fixture. See `scripts/downtify-modern-smoke.cjs`. Test profiles, generated audio, screenshots and request logs stay ignored under `artifacts/`.
- Retained Downtify 3.9 Electron connection/stream/seek/save/albums/library/virtualization/search checks passed.
- Broad packaged Windows verification passed with zero renderer errors, including existing Navidrome/Audiobookshelf original audio, offline books/episodes and cross-file seeking, synchronization, native gapless/crossfade, backup/restore, typography, themes, custom mixes and installer exit. Packaged modern Downtify native checks passed as well; final Doctor pagination is also covered by its HTTP regression and Electron workflow.

No real-user server was modified or used for maintenance/download tests. Upstream network-provider behavior, deployment-specific permissions and server settings still require ordinary real-server use; fictional fixtures cannot establish those. Postman owner mock discovery was skipped because CLI was signed out; only local simulation was used. There is no claim of full Downtify website parity or mobile implementation.

Pinned references: [client contract](https://github.com/henriquesebastiao/downtify/blob/3.13.0/docs/mobile-client-contract.md), [API reference](https://github.com/henriquesebastiao/downtify/blob/3.13.0/docs/api-reference.md), [Doctor implementation](https://github.com/henriquesebastiao/downtify/blob/3.13.0/downtify/doctor_routes.py).
