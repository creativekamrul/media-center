# Validation — 0.2.2

Validation date: 2026-09-07. Supported target: Windows x64.

## Automated checks

- Strict TypeScript checking and the production Electron/Vite build pass.
- 51 unit/regression tests cover domain separation, whole-book timelines, exact episode routes, provider transport, playlist duplicate ordering, catalog pagination, status filters, local metadata/path containment, queue edits, buffering-aware listening time, MPV readiness, update actions and installation preparation.
- Real NSIS updater tests verify manual downloads, matching SHA-512 checksums, corrupt-file rejection, same/older version rejection, and disabled installation on quit. Downloads use inert fixture files and never execute an installer. See `artifacts/updater-smoke.json` after running `npm run test:updater`.
- Source-build native desktop integration passes with no renderer exceptions. The test uses isolated Navidrome and Audiobookshelf fixture servers, encrypted SQLite connections, and muted real MPV.
- The same suite supports packaged verification with `MEDIA_CENTER_EXECUTABLE`. Its definitive outcome is written to `artifacts/packaged-smoke.json`; source results are in `artifacts/desktop-smoke.json`.

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

## Limits

These tests use synthetic fixtures, not the user's production accounts. Production Navidrome 0.60.3/ABS 2.35.1, the user's complete FLAC/MP3/M4B collection, DAC-specific exclusive/bit-perfect fidelity, long-duration playback, suspend/resume, and the interactive installer wizard have not been verified here. The previous release's MPV integration was reported working by the user; that does not replace regression or hardware testing of this release.

See `FEATURES.md` for substantive parity gaps. Passing tests does not certify full Feishin or Audiobookshelf feature equivalence.
