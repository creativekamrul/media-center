# On-device preview checklist

Preview 0.1.1 supports real Navidrome connection and library browsing alongside a separate fictional demo. MPV playback, downloads and other mobile providers remain incomplete.

- Launch without a Metro server; inspect floating navigation and safe areas.
- Open the hamburger menu, then Settings > Connections > Add Navidrome.
- Test invalid credentials, then save a valid server; HTTPS is default, HTTP requires explicit opt-in.
- Browse albums, artists, playlists, and tracks; search and retry errors.
- Edit/test/remove connections without modifying server data.
- Force-stop/relaunch to check saved connections and selected account.
- In the demo, favorite tracks and customize library views; verify persistence.
- Inspect the player vector icons and close button.

The APK uses the generated development signing key. Production signing and update distribution are not configured. Do not publish it as a feature-complete release.

Verified on S23 Ultra / Android 16 for preview 0.1.1: wrong-password error, native token-authenticated fixture requests, connection save and reload after process restart, album artwork and track browsing. Desktop typecheck/build and 300 tests pass; mobile TypeScript and four playlist-export tests pass. Automated form interaction required Samsung keyboard dismissal and scrolling; the Android confirmation uses uppercase REMOVE. Real server playback and DAC output are not tested or implemented.

Device automation was stopped when the user began entering their own connection. The test reached the removal confirmation for MC-Native-Fixture; automated cleanup confirmation was interrupted and should not be claimed as passed.

Preview 0.1.2 installed and verified on the connected S23 Ultra: album details omit the root menu/header; hardware Back returns to the library and then Home without exiting. Read-only device test passed using the selected library. Mobile TypeScript and six tests pass; desktop TypeScript/build and 300 tests pass. No audio playback claims.
