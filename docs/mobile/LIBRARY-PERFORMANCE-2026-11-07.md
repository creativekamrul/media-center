# Mobile library improvements and performance check — 2026-11-07

## Implemented
- Shared action sheets cover music, Audiobookshelf and Jellyfin. Music albums/playlists support queue and cache actions; spoken media keep book/episode identity and supported actions.
- Music filters, sort and scroll offset persist in a bounded 30-view history. Restoring distant offsets loads pages before scrolling. Audiobookshelf query/sort and Jellyfin sort also persist; their scroll offsets are not yet persisted.
- Cache shows per-library logical storage totals, existing failed-transfer Retry, and confirmation before removing a cached copy. Native removal preserves files still referenced by other cached entries. Exported M3U8 files may need regeneration after removal. Removal is blocked during active transfers/verification.
- Queue: drag handle, swipe removal, accessible move control, ten-second undo and Jump to current. Removed descriptors are retained only for the undo window and released on expiry or replacement.
- Connection guidance distinguishes authentication, certificate, timeout and DNS problems where the provider exposes those errors. Retry remains available without blocking other libraries.
- Cache polling runs only during active transfers, at three-second intervals. Audiobook summaries build one cache index rather than reparsing all records for every part. Original-order lists avoid normalization/sorting work. Request metadata retention is capped at 16 MiB of estimated string size, plus entry limits. Queue rows are isolated from the playback clock.

## Verification
- Mobile typecheck and lint pass; 49 JavaScript tests pass.
- 47 native tests pass, including queue occurrence/current-index regression cases.
- Release build installed on emulator-5554 with existing accounts and settings preserved.
- Emulator checks passed: native playback, remove/undo, drag reordering, swipe removal/undo, jump to current and music filter restoration after process restart.
- Cache deletion was not exercised on the user's real cached media. Certificate/authentication failure guidance has classification tests, not live deliberately broken server credentials.

## Measurements and limits
The connected Navidrome library was browsed for three cycles of eight downward and eight upward gestures (48 total), in an ARM-translated Android emulator.

- PSS memory (KiB): 222920, 262499, 260153, 262514. Artwork loading raised memory initially; subsequent passes stayed near 256 MiB.
- Frames: 730; janky frames: 330 (45.21% by Android's current metric).
- Frame times: median 18 ms, p90 25 ms, p95 30 ms, p99 40 ms.
- Cold activity launch: 946 ms (Android am start -W), excluding later network browsing.
- Next-track to observed native PLAYING: 3.15 seconds, including ADB polling and input overhead; not precise decoder latency.
- Windows Node metadata benchmark at 100000 entries: title sort 81 ms; original order 0.46 ms. This does not establish Android rendering performance or a 100000-track live-server test.

The 200 GB library size is not a memory allocation target: browsing uses metadata pages and size-appropriate artwork, while audio streams through MPV. Track count and provider responses still determine loading cost. Whole-collection custom sorts can require fetching all matching metadata; they are not server-indexed sorts. Frame drops remain in this emulator; physical-phone performance remains to be measured. No claim of complete optimization, gapless playback, USB exclusive output or bit-perfect output is made.

Artifacts are in ignored artifacts/mobile-native-tests and artifacts/mobile-device. No server credentials, library exports or build outputs should be committed.
