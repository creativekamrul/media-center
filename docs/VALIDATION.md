# Validation — 0.3.5

Validation date: 2026-09-08. Supported target: Windows x64.

## Automated checks

- Strict TypeScript checking and the production Electron/Vite build pass.
- 72 unit/regression tests cover domain separation, whole-book timelines, exact episode routes, provider transport, playlist duplicate ordering, catalog pagination, status filters, local metadata/path containment, queue edits, buffering-aware listening time, MPV readiness, update actions and installation preparation.
- Real NSIS updater tests verify manual downloads, matching SHA-512 checksums, corrupt-file rejection, same/older version rejection, and disabled installation on quit. Downloads use inert fixture files and never execute an installer. See `artifacts/updater-smoke.json` after running `npm run test:updater`.
- Source-build native desktop integration passes with no renderer exceptions. The test uses isolated Navidrome and Audiobookshelf fixture servers, encrypted SQLite connections, and muted real MPV.
- The complete native suite also passes against the packaged 0.3.5 Windows executable using `MEDIA_CENTER_EXECUTABLE`, with no renderer errors. Its outcome is written to `artifacts/packaged-smoke.json`; source results are in `artifacts/desktop-smoke.json`.

- Calendar regressions cover one-day activity, empty history, month boundaries, and leap years. Download regressions exercise real temporary files and controlled streaming for bulk pause, resume, active removal, and book/episode identity.
- Desktop checks cover empty/populated charts, partial/all download selection, canceled and confirmed bulk removal, and thin history rows.

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
- Compact Home album and Continue listening cards with long titles and sparse collections; top-right Play icons and secondary-action menus with 36-pixel hit targets; readable notes search fields at 1008, 1440, and 1920 pixels in forest and charcoal themes.
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

## Unreleased settings and player polish — 2026-09-08

- `npm run typecheck`, `npm test` (116 tests), and `npm run build` passed.
- `npm run test:desktop` passed against the production Electron build with muted native MPV, two fixture servers, three media types, and zero renderer errors. This run used the built app, not a newly packaged installer.
- New checks cover coalesced/trailing telemetry and immediate command/error updates for both books and podcasts; bounded UTF-8 CSS import and backup validation; enhanced-LRC word boundaries, repeated timestamps, offsets, and fallback fills.
- Desktop checks cover six settings sections, manual-scroll active tracking, all 13 palette surfaces, 1024/1440/1920 layouts, shared preference saves, CSS preview/persistence/removal in both windows, mini-player fullscreen rejection, F11/Escape, and visible karaoke fill after seeking.
- Existing native checks still pass: seeking and dragging, track-change reset, gapless music, book chapter/file conversion, episode-specific progress, offline playback, safe progress synchronization, backups, and lyric binding.
- Screenshot artifacts remain in ignored `artifacts/`, including `settings-polish-*.png`, `settings-playback-final.png`, and `lyrics-synced.png`. No new GitHub release or installer was published for this change.

## Local 0.7.1 installer — 2026-09-08

- Built `release/Media-Center-0.7.1-win-x64.exe` using `npm run package:win` with publishing disabled. Version consistency and typecheck/build passed.
- The full `npm run test:desktop` suite passed against `release/win-unpacked/Media Center.exe` with muted native MPV: two fixture servers, three media types, and zero renderer errors. Settings, all palettes, CSS import/removal, mini-player restrictions, fullscreen, karaoke fill, seeking, gapless playback, offline progress, and backup checks passed.
- Installer size: 114,530,448 bytes. A SHA-256 sidecar is saved alongside the installer. Packaged validation details are in ignored `artifacts/packaged-smoke.json`.
- This is a local test release. No GitHub tag or release was pushed or published. Interactive installation into the user's normal profile is left for the user to test.


## Local 0.7.2 installer - 2026-09-09

- `npm run typecheck`, `npm test` (119 tests), `npm run build`, and `npm run release:check` passed. `npm run package:win` built the local NSIS installer with `--publish never`.
- The final packaged `release/win-unpacked/Media Center.exe` passed the complete `npm run test:desktop` suite with muted native MPV, two fixture servers, music/books/podcasts, and zero renderer errors.
- New checks cover older immersive preference migration, bounded color/font/layout settings, native popup focus containment, live preview, save/reopen, reset/cancel rollback, Escape keeping the playing screen open, narrow-popup overflow, current-word versus sung-word state/color, and actual rendered font selection. Existing reduced-motion, seeking, queue, offline, progress, theme, and mini-player checks pass.
- Visually reviewed the popup, selected Settings pills, and customized lyric view using labeled fixture music. Screenshots are in ignored `artifacts/lyrics-appearance-popup.png`, `artifacts/lyrics-focus-words.png`, and `artifacts/settings-polish-1920.png`.
- Installer: `release/Media-Center-0.7.2-win-x64.exe`, 114,534,798 bytes. SHA-256: `597267b7315737e57dbd96dd526c88f04a426cc5b29f73a7fb71b685a0739752`; a checksum sidecar is included.
- Local test release only; no GitHub push, tag, release or publication. Interactive installation into the user's normal profile remains for their testing.


## Local 0.7.3 installer - 2026-09-09

- Typecheck, build, version validation and all 122 unit tests passed. Built `release/Media-Center-0.7.3-win-x64.exe` with publishing disabled.
- The final packaged application passed the complete native MPV desktop suite with two fixture servers, all three server media types and zero renderer errors. Checked shared normal/immersive lyric typography and current-word colors, Home shelves at three sizes, shelf popovers and nested listening-plan dialogs, actual favorites-mix playback, device stats and existing playback/seek/offline/backup behavior.
- Local tests cover nested metadata indexing, album-artist identity, rescan deletion, root-scoped favorites/playlists, ordered duplicate playlist entries, path traversal rejection and junction escape/cycle handling. Desktop checks cover nine local tabs, recursive album detail, favoriting, playlist creation/reopening, search, native folder playback and favorites/playlists surviving application restart.
- Screenshots reviewed: `artifacts/normal-lyrics-custom.png`, `artifacts/home-compact-1920.png`, `artifacts/local-library-playlist.png`. Fixture content is test data, not a user's library.
- Installer size: 114,542,082 bytes. SHA-256: `c29785331c196e7113929ec7c41cab2d9fcfa20e6a8a5817582244710891ea1a`; checksum sidecar saved beside the EXE.
- No GitHub push, tag or release publication. Installation into the normal user profile remains for the user's local testing. Indexing limits and local playlist/backup limitations are documented in FEATURES and USER-GUIDE.

## Local 0.7.4 installer - 2026-09-09

- Typecheck, production build, release version validation and all 126 unit tests passed. New regressions cover visual-only word estimates, preservation of real timing, Unicode/whitespace, and invalid intervals.
- Source and final packaged Electron builds passed the complete native desktop suite with muted MPV, two fixture servers, all three server media types and zero renderer errors.
- Word-lift checks exercise actual computed displacement for successive words in normal and immersive views, seek updates, running playback, stable wrapping, enhanced-LRC timing priority, reduced motion and the Smooth motion toggle. Home checks verify hidden scrollbars and working forward/back arrows at three window sizes.
- Visually reviewed `artifacts/normal-word-lift.png`, `artifacts/immersive-word-lift.png` and Home using fixture content. Line-only word motion is an estimate for presentation, not provider-supplied timing, and is never stored in lyric records.
- Local installer: `release/Media-Center-0.7.4-win-x64.exe`, 114,544,437 bytes. SHA-256: `810ce54311aed020ea62b766d5909a6992e65569a6d78fdde79025f901b4381e`; checksum sidecar saved alongside it.
- Built with `--publish never`. No GitHub push, tag or release publication. Installation into the normal user profile remains for the user's testing.

## Local 0.7.5 installer - 2026-09-09

- Typecheck, production build, release version validation and all 126 unit tests passed.
- Source and final packaged applications passed the complete Electron/MPV desktop suite with zero renderer errors.
- Updated lyric regressions verify 18% centered word enlargement with no translation, fixed word centers across successive highlights, stable wrapping, seeking, real versus estimated timing, running playback and reduced-motion/Smooth motion behavior in both lyric views.
- Reviewed `artifacts/normal-word-emphasis.png` and `artifacts/immersive-word-emphasis.png` using fixture lyrics. The Flow appearance preview now uses centered growth as well.
- Local installer: `release/Media-Center-0.7.5-win-x64.exe`, 114,543,747 bytes. SHA-256: `731546da65eb97433c4cbc67c70e61d4cce95f790dd2198fa8ff1966bce91517`; checksum sidecar saved alongside it.
- Built with publishing disabled. No GitHub push, tag or release. Installation into the normal user profile remains for the user's testing.

## 0.7.6 release validation - 2026-09-09

- Typecheck, build, release checks and all 126 unit tests passed. Real NSIS updater tests passed, including checksum rejection and no implicit installation.
- Source and local packaged Electron applications passed the full desktop suite with muted native MPV, isolated fixture servers and zero renderer errors. Player checks cover larger square artwork at three window sizes, visible volume hit targets, no horizontal overflow, and keyboard volume changes reflected in the percentage and filled track.
- Reviewed the new Home, local library, immersive player and lyric appearance screenshots before copying them to site/assets. Older sample-library images remain identified in the asset provenance document. Website static validation checked eight gallery panels/tabs, unique IDs, anchors, local assets and JavaScript syntax; the local page returned HTTP 200.
- Local installer: release/Media-Center-0.7.6-win-x64.exe, 114,545,086 bytes, SHA-256 e6d9f617df37f7e32fc2d46fac6bb8b7ef55a06357a2026b2e97142be45ba321. GitHub Actions rebuilds public assets from the tagged source; public checksums may differ from the local build.
- GitHub publication is explicitly requested for this release. The release workflow gates publication on its own source and packaged checks; Pages deploys only site/.

## 0.7.7 publication retry - 2026-09-09

- Reproduced the 0.7.6 CI shelf timeout locally. The test expected a scroll offset strictly below 2px, but Chromium's snap can settle at exactly the 2px inset that the UI correctly recognizes as the start.
- The harness now shows source-test windows without taking focus, waits for the forward scroll to settle, uses the UI's inclusive start boundary, and waits for the disabled Previous button and rendered volume percentage. No app behavior or publication gate was bypassed.
- The no-MPV source suite and complete native packaged suite passed with zero renderer errors. Typecheck, build and release version checks passed; application logic and the 126 passing unit tests are unchanged from 0.7.6.
- Local 0.7.7 installer: 114,546,893 bytes; SHA-256 68632f41630d7e6af2cc5f4b9c66d0e7e976440804fb67ecfd4c674e302ffcfe. The failed v0.7.6 tag is preserved; no GitHub release was created for it.

## Local 0.7.8 UI refinement - 2026-09-10

- Typecheck, production build, release metadata checks and all 128 unit tests passed.
- Source and packaged Electron suites passed with muted native MPV, isolated fixture servers and zero renderer errors. No user library or settings were modified.
- Checked Solid and Gradient in all 13 palettes, live mini-player synchronization, shared saves, legacy appearance defaults and validated backup preservation.
- Layout checks cover 1008, 1440 and 1920px windows, wrapping library continuation cards, hidden horizontal scrollbar chrome, retained Home arrow navigation, and player sizing.
- Reviewed fixture screenshots for the flat Home, Black Glass Settings and the appearance editor. Functional lyric gradients, word emphasis, seeking, volume and native playback remain covered by the desktop suite.
- Local installer: release/Media-Center-0.7.8-win-x64.exe, 114,547,612 bytes. SHA-256: a1032caa2d35b2c117ff3d3a47b53b8cf32db901817004f087db88a43fa1dad1. Checksum sidecar is alongside the installer.
- Built with --publish never; no GitHub push, tag or release. Installation into the normal user profile remains for the user's testing.

## Local 0.7.9 artwork, mixes and translucency - 2026-09-10

- Typecheck, build, release metadata checks and all 131 unit tests passed. Mix regressions cover source identity, real music filtering, duration thresholds, bounded output and artwork preservation. Listening leaders retain book/episode/track identities; preference backups preserve translucency.
- Source and final packaged Electron/MPV suites passed with isolated fixture servers and zero renderer errors. Playlist thumbnails load actual PNG fixture data via the authenticated main-process cover API; local rows retain their fallback when embedded art is absent.
- Desktop checks verify narrow playlist rows, local-library layouts at 1024/1440/1920px, theme surface modes, live translucency propagation and save, plus normal/immersive lyrics, queue, offline playback, seeking and server progress regressions.
- Reviewed fixture playlist artwork and local-library screenshots. Thumbnail loading uses shared bounded caches; Home album sampling requests at most four albums with at most 25 tracks per album.
- Local installer: release/Media-Center-0.7.9-win-x64.exe, 114,549,943 bytes. SHA-256: dc756fb6c2487f68df26d4ccad4e58e93885ee4cb1d43d0d622d702c8aca6f48. Checksum sidecar saved alongside it.
- Built with --publish never. No GitHub push, tag or release. Normal-profile installation remains for user testing.

## 0.8.0 local release — 2026-09-10

- TypeScript check, all 140 unit tests, production build and release metadata check passed.
- Source and packaged Electron smoke tests passed against fixture Navidrome/Audiobookshelf servers and muted native MPV; zero renderer errors. Existing book/episode identity, cross-file seeking, themes, lyrics, fullscreen, mini-player restrictions and restart persistence remain covered.
- New UI flows covered Home order/visibility, mix preview/regeneration, unified search and its track menu, local playlist editing/M3U round-trip, per-song lyric offsets, Windows media metadata, podcast rules, remapped shortcuts, shared preference saves and density.
- Source and packaged reset tests confirmed cache/personal/full scopes, restart request and preservation of a sentinel original media file in disposable profiles. No real user data was reset.
- Native and packaged Windows SMTC checks confirmed a real OS session with artwork, metadata, paused state and timeline. The helper retains its thumbnail stream until replacement/exit; source and packaged resource paths were verified.
- Unit regressions cover exact-byte Range/If-Range resume for books and episodes, local file-identity rename matching, music-only natural-end autoplay, backup source remapping, reset scope, and automatic-download ownership.
- Local installer: `release/Media-Center-0.8.0-win-x64.exe`, 152,690,791 bytes. SHA-256: `9384ab141f7240e14c180068bdc05bbb6a575d757a9cfd30f55ab3ed90c35a69`.
- Reports/screenshots: ignored `artifacts/desktop-smoke.json`, `artifacts/packaged-smoke.json`, `artifacts/*0.8.png`, and `artifacts/windows-media-0.8.json`. Runtime license notices are included under packaged `resources/smtc/notices/`.
- Publication: no commit/tag push or GitHub release was performed. This installer is for local testing first.


## Local 0.8.1 UI refinement

Home actions remain adjacent at 1008, 1440 and 1920 pixels. Listening panels use one consistent reading and keyboard order, with aligned fields, grouped checkbox descriptions and separate action footers. Responsive Electron assertions cover panel widths, overflow, inter-panel spacing and podcast action separation. Existing theme, preference persistence, playback, download, backup and reset-cancellation checks remain in the desktop suite.


## Local 0.9.0 validation — 2026-09-10

- TypeScript checks and production build pass; 160 unit/regression tests pass.
- Source Electron integration passes with no renderer exceptions, using isolated Navidrome/Audiobookshelf fixtures and muted native MPV.
- New native checks cover profile capture/application, per-output preference restore, library health, book-series identity/order, RSS preview/search/OPML review and subscription payloads, redacted diagnostics, guarded undo, local/embedded lyrics and editing, cover design/save, and 12 distinct Recap compositions with 12 palettes.
- MPV crossfade is checked across separate queue songs, pause/resume during overlap, completion without a duplicate advance, and stop cleanup. Unit tests keep books/episodes/radio, exclusive mode, repeat-one and album-preservation boundaries separate. Audible quality still needs user listening tests on actual output hardware.
- Gallery exports are generated with clearly artificial test statistics in `artifacts/recap-0.9/`. No sample statistics enter the real application database.
- The local installer is additionally checked through the same packaged Electron/native MPV suite before handoff; its machine-readable result is `artifacts/packaged-smoke.json`.
- No GitHub release or Pages publication is part of this local preview.

- Final packaged v0.9.0 suite passed with zero renderer errors, including the full Studio checks and real MPV crossfade.
- Local installer: `release/Media-Center-0.9.0-win-x64.exe`, 152,717,305 bytes. SHA-256: `5d2a5970224116b285449a73db8edbd96c8d1061de7104605b36f80cc046f522`. Built with `--publish never`; no publication performed.

## Local 0.9.1 collection headers — 2026-09-10

- Typecheck, all 160 unit tests, production build and release metadata checks passed.
- Final packaged Electron/native MPV suite passed with zero renderer errors. Source desktop suite also passed before the final narrow-window label CSS correction.
- Playlist, album, audiobook, podcast and local-playlist headers checked at 1008, 1440 and 1920 pixels for square artwork frames, full-width action rows, visible labels, usable button targets and no horizontal overflow.
- Visually reviewed final narrow playlist and listening-summary screenshots. Statistics retain the daily goal as a percentage and identify completed items as all-time totals.
- Fixed a desktop-test wait that queried lyric styles before the current line mounted; the final suite verifies the style after it exists.
- Installer: `release/Media-Center-0.9.1-win-x64.exe`, 152,718,230 bytes. SHA-256: `f201d6e95d5c01cd580106a3af5c22c0a2924a4a85a2c2467699b1c8cc0521c2`.
- Built with `--publish never`. No GitHub publication or normal-profile installation performed.

## Local 0.9.2 artwork sizing — 2026-09-10

- Typecheck, 160 unit tests, production build, release metadata and final packaged Electron/native MPV suite passed with zero renderer errors.
- Source desktop suite passed before the final content-change observation addition; the packaged suite covers that final build.
- Collection headers and Home featured artwork are checked for square proportions, equal top/bottom padding, full inner-height coverage and separation from text/actions at 1008, 1440 and 1920 pixels.
- Reviewed fixture screenshots of the enlarged Home and playlist artwork. Collection sizing observes final content height after wrapping; exceptionally narrow layouts stack artwork above content.
- Installer: `release/Media-Center-0.9.2-win-x64.exe`, 152,720,495 bytes. SHA-256: `9049c0b9a4f22597b5b7e61a076f69922dc25ef4898155d7c34a7f036467569d`.
- Local preview only; no GitHub publication or normal-profile installation performed.

## 1.0.0 release validation — 2026-09-10

- Typecheck, all 160 unit/regression tests and the production build passed.
- Source and packaged Electron suites passed with muted native MPV and zero renderer exceptions. Checks cover music, multi-file books, independent podcast episodes, seeking, downloads, lyric editing, profiles, undo and crossfade.
- Settings search preserves unsaved drafts, focuses/highlights matching controls, handles no matches and clears with Escape. Release highlights persist dismissal across restart and reopen from Updates.
- New connection-failure fixtures verify the error state and successful retry. Library refresh preserves the selected playlist view.
- Settings, player and modal layouts passed Chromium interface-zoom checks at 100%, 125%, 150% and 200%. Actual Windows monitor/DPI combinations and audio hardware still need user testing.
- The no-MPV desktop path used by GitHub Actions passed locally. Real NSIS updater tests passed manual download and checksum rejection without installing a fixture.
- Packaged reset checks preserved the original-media sentinel while exercising cache, personal and full-reset scopes. The packaged Windows SMTC helper exposed real artwork, metadata and paused timeline state.
- Website checks passed at 1440, 768 and 390 pixels, including local assets, ten gallery tabs, keyboard navigation, image dialog/Escape and no-JavaScript access.
- Local installer: `release/Media-Center-1.0.0-win-x64.exe`. SHA-256: `4887796301f6de8969ed5d98441734d49bc2d72252f4f9a8ccbb6299bc5f2889`.
- This installer was built with `--publish never` and verified before the authorized GitHub publication. GitHub Actions builds its own installer from the tagged source; that asset has its own checksum.
