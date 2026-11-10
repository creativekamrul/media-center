# Media Center for Android 1.0.0

First public Android release. See [release verification and practical limits](RELEASE-GATES.md) for the tested scope.

## Libraries

- Navidrome music, albums, artists, playlists, favorites and supported playlist edits.
- Downtify 3.9 browsing, saved libraries, Discover, public-link previews, streaming and supported save/download/manual-playlist actions.
- Audiobookshelf books, chapters, series and independently identified podcast episodes, with progress, transcripts, bookmarks and inbox controls.
- Jellyfin libraries, music, movies and shows, native original-video playback, subtitles/audio tracks, chapters, seeking and picture-in-picture.
- Device audio and radio, plus source-aware combined search and cross-library app playlists, collections and pins.

## Listening

- Native MPV decoding, original Navidrome streams, separate music/spoken sessions, queue editing and configurable media-button behavior.
- Gapless music preparation and optional crossfade; spoken media does not crossfade. The user confirmed the requested DAC listening, unplug/reconnect and screen-off checks; exclusive USB output is not claimed. Audible gapless/crossfade quality remains a separate check.
- Graphic and parametric EQ, tonal presets, saved profiles, ReplayGain and output profiles that do not raise the current volume when applied.
- Spoken speed/voice controls, optional silence skipping, resume rewind, sleep timers, bookmarks and a touch-control lock.
- Synced music lyrics, custom LRC import/export, custom artwork and separate spoken transcripts.
- Bundled DM Sans/Sora fonts, customizable colors and surfaces, a floating navigation/player layout and a landscape listening layout.

Original-source decoding does not establish exclusive or bit-perfect USB output. The signal-path panel reports the engine's input/output information; Android's audio path can still process or resample audio.

## Discovery and offline files

- Favorites/recent/most-played shelves, listening history, recommendations with feedback, artist/track radio, custom mixes and bounded foreground mix refresh.
- Original-file caching in a user-selected public folder, storage/connection conditions, individual transfer controls, integrity checks and retained artwork.
- Flat or Artist / Album layouts, shared-file reuse and relative M3U8 exports for other players. Older exports require explicit preview/linking before the app maintains them.
- Opt-in scheduled saved-music collection caching through Android WorkManager. Android can defer work. Podcast inbox checks and predictive caching remain foreground operations.

Interrupted partial files restart from the original source; byte-range continuation and uninterrupted huge background transfers are not promised. Force-stopping Android requires reopening the app and explicitly resuming paused work. Unknown external files/playlists are not adopted or deleted automatically.

## Installation and data

The public candidate is ARM64. The x86 Android emulator uses a separate compressed-native-library test package; its ARM translation cannot launch the phone package's direct-APK native libraries.

Production identity: certificate SHA256 `058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65`. Version code is 9. Later production updates must retain this certificate.

Development previews use a different certificate, so Android refuses a direct replacement. Follow [BACKUP-MIGRATION.md](BACKUP-MIGRATION.md), save and verify the encrypted backup off-device before any uninstall, and restore only on a fresh destination. Connections, personal settings/history and custom assets migrate; media files, cache catalogs, active jobs and Android folder grants do not. Re-select folders afterwards. This is not a seamless migration of a 200 GB cache.

Android Auto is deferred. Device handoff and additional widget work are excluded from this release's approved scope.

## Distribution files

Publish the verified ARM64 APK with its SHA256, the complete application/JNI/build-plugin source, the pinned MPV/FFmpeg source collection and the collected third-party notice archive. Emulator packages and development-signed previews are local test artifacts, not public updater assets. The mobile release must not replace the desktop release's latest marker.

## Practical limits

- Android 8.0+ and ARM64 only; no iOS or public x86 build.
- Music queues accept up to 5,000 entries. The generated 10,000-track browsing fixture is not a supported single queue.
- Bluetooth-button combinations and audible gapless/crossfade quality are not exhaustively verified. USB-exclusive and bit-perfect output are not implemented claims.
- Background rules are subject to Android scheduling; partial downloads restart. External video subtitles are not cached.
