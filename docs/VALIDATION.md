# Validation — 0.3.1

Validation date: 2026-09-08. Supported target: Windows x64.

## Automated checks

- Strict TypeScript checking and the production Electron/Vite build pass.
- 67 unit/regression tests cover domain separation, whole-book timelines, exact episode routes, provider transport, playlist duplicate ordering, catalog pagination, status filters, local metadata/path containment, queue edits, buffering-aware listening time, MPV readiness, update actions and installation preparation.
- Real NSIS updater tests verify manual downloads, matching SHA-512 checksums, corrupt-file rejection, same/older version rejection, and disabled installation on quit. Downloads use inert fixture files and never execute an installer. See `artifacts/updater-smoke.json` after running `npm run test:updater`.
- Source-build native desktop integration passes with no renderer exceptions. The test uses isolated Navidrome and Audiobookshelf fixture servers, encrypted SQLite connections, and muted real MPV.
- The complete native suite also passes against the packaged 0.3.1 Windows executable using `MEDIA_CENTER_EXECUTABLE`, with no renderer errors. Its outcome is written to `artifacts/packaged-smoke.json`; source results are in `artifacts/desktop-smoke.json`.

## Native scenarios

The MPV test executable is `mpv-v0.41.0-dev-g989d32716-34070939881-x86_64-pc-windows-msvc`, obtained from the official mpv-player CI distribution. It is a test dependency, not bundled in the installer.

Verified against fixtures:

- Authenticated 24-bit/96 kHz stereo WAV streaming, including a 345,600,044-byte virtual file without full-file allocation.
- Episode-specific sessions; resume 450 seconds into a two-file book; seek backward to the first file while paused; server receives whole-book position.
- Raw Navidrome stream parameters and speed reset from spoken audio to music.
- Playlist creation and membership replacement preserve ordered repeated tracks.
- Episode status filtering, searching, sorting, and exact episode completion writes.
- Expanded Now Playing and queue move/remove/append controls.
- Listen Later save, reschedule, completion and restart persistence.
- Local-folder structure, 48 kHz/16-bit WAV metadata and MPV playback.
- Live ReplayGain and equalizer commands.
- Restart restores queue, roots, plans and preferences without autoplay.
- Credentials excluded from renderer settings; explicit sample/real-library distinction; minimum 1024 × 720 layout without horizontal page overflow.
- Playlist action alignment and minimum button sizes; detail navigation resets inherited scroll; episode status and playback controls remain grouped at 1024 and 1920 pixels.

Reviewed screenshots include playlist detail, episode status controls, Now Playing, local files, listening plans, and the minimum-size window. Test artifacts and profiles are ignored by source control and excluded from releases.

## Daily-use regression coverage

The 0.3 suite additionally covers:

- Persistent podcast/Last.fm cache isolation when music libraries refresh, plus the exact 1008-pixel Windows client width seen on CI.

- Original book-file download routes versus independently identified podcast audio files, and raw Navidrome downloads.
- Offline book chapters spanning two physical files, whole-book seek conversion, paused seeks, and separate episode identity.
- Smart rewind thresholds and exact explicit positions.
- Gapless state advancement only after MPV file-loaded, with no replacement/stop between staged tracks; real MPV advances a local queue.
- A real mini BrowserWindow, default always-on-top state, pin toggle and rejection of settings IPC from that window.
- Download state/progress, saved queue restoration without autoplay, note persistence, Home and cross-show inbox.
- Offline position preview and explicit server commit, personal backup export/preview/transactional restore, and rejection of unknown backup fields.
- Listening statistics accumulation on the device.
- Discord framing with Unicode byte lengths, fragmented READY events, acknowledgements, ping/pong, privacy clearing and reconnect using a fixture transport.
- Discord per-media privacy, pause/buffering timestamps, speed-adjusted duration, and rejection of private/arbitrary artwork URLs.

Screenshots include the mini-player, Home, Downloads, queue and minimum window layout. `scripts/daily-smoke.cjs` is run by the desktop suite when `MPV_TEST_PATH` is set. GitHub's default UI jobs do not download MPV; native testing is performed with an explicitly supplied executable.

## Limits

These tests use synthetic fixtures, not the user's production accounts. Production Navidrome 0.60.3/ABS 2.35.1, the user's complete FLAC/MP3/M4B collection, DAC-specific exclusive/bit-perfect fidelity, long-duration playback, suspend/resume, and the interactive installer wizard have not been verified here. The previous release's MPV integration was reported working by the user; that does not replace regression or hardware testing of this release.

Live Discord profile display and Last.fm key validation require the user’s own Application ID/API key and have not been tested against their account. Book/podcast presence is text-only; crossfade, M3U/XSPF interoperability and automatic offline reconciliation are not implemented.

See `FEATURES.md` for substantive parity gaps. Passing tests does not certify full Feishin or Audiobookshelf feature equivalence.
