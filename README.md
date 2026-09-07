# Media Center

A Windows desktop home for Navidrome music, Audiobookshelf books and podcasts, and local audio folders. Built with Electron, React, TypeScript, SQLite, and native MPV playback.

**Version 0.5.0** adds LRCLIB lyrics, Black Glass, and fixes search-field styling and outer-window scrolling. It includes Home, a podcast inbox, original-quality offline downloads, an always-on-top mini-player, gapless music, saved queues, listening notes and statistics, local rule playlists, personal backups, and optional Discord/Last.fm artwork integration. Controls have a cleaner rounded appearance while retaining the existing themes and fonts. The long-term goal remains Feishin and Audiobookshelf client parity. See the [feature inventory](docs/FEATURES.md) for exact support and remaining work.

## Install and connect

1. Download and run the EXE from [GitHub Releases](https://github.com/creativekamrul/media-center/releases/latest). Current builds are unsigned.
2. In Settings, select your existing `mpv.exe`. MPV is not bundled.
3. Connect Navidrome using its base URL, username, and password.
4. Connect Audiobookshelf using its base URL and API key/access token.
5. Browse Music, Audiobooks, or Podcasts. Choose Local Files → Add folder for audio on your computer.

Compatibility baseline: Windows, Navidrome **0.60.3**, Audiobookshelf **2.35.1**, and MPV **0.38+**. Native tests exercise an MPV 0.41 development build. Other MPV versions and audio hardware require their own validation.

## Listen

- Select tracks to play, queue, or add to a playlist. Heart buttons and song ratings update Navidrome.
- Books have chapters and physical files; podcast shows contain independent episodes, each with its own progress.
- Click the playing cover to open the large player and current queue.
- Use Listen later to save a date and note. Plans and recent history are private to this device.
- Local folders preserve their structure. Reading audio tags never modifies media files.
- ReplayGain, EQ, exclusive output, and close-to-tray are optional.

See [the user guide](docs/USER-GUIDE.md) for controls and troubleshooting.

## Develop

Requires Windows, Node.js 22+, and npm.

```powershell
npm ci
npm run dev
```

```powershell
npm run typecheck
npm test
npm run test:updater
npm run build
npm run test:desktop
npm run package:win
```

For muted native playback tests, set `MPV_TEST_PATH` to your MPV executable. For packaged tests, also set `MEDIA_CENTER_EXECUTABLE` to `release\win-unpacked\Media Center.exe`. Tests use isolated fixture servers and app profiles. Reports/screenshots go to ignored `artifacts/`; installers go to ignored `release/`.

## Release a version

Update the package version and changelog, run checks, and commit on `main`. Run `npm run release:preview` to preview, then `npm run release` to push the version tag using your authenticated GitHub CLI. GitHub Actions builds and tests the Windows app before publishing its installer, corresponding source, and checksums. See [the release guide](docs/RELEASING.md) for setup and troubleshooting. Installed versions from 0.2.2 onward can use **Settings → App updates → Check for updates → Download update → Restart and install**. Versions 0.2.1 and earlier need one manual upgrade. Updates use stable releases only; download and installation require your action.

## Playback and privacy

MPV reads original streams directly. Navidrome requests `format=raw&maxBitRate=0`; Audiobookshelf creates direct-play sessions. The interface never decodes media, receives saved credentials, or buffers complete audio files. Original streaming does not itself certify bit-perfect device output.

Credentials use Electron safeStorage (Windows DPAPI). SQLite stores settings, queues, local tag caches, checkpoints, plans, and history under the app user-data directory. No app analytics service is configured.

Server progress is authoritative on resume. Sync failures are visible and checkpointed locally; automatic offline reconciliation is not yet implemented. Music scrobbling can be disabled independently of Audiobookshelf progress synchronization.

## Contribute and license

Licensed **GPL-3.0-only**. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Distributed modified binaries require corresponding source under the GPL.

[Architecture](docs/ARCHITECTURE.md) · [API contracts](docs/API-CONTRACTS.md) · [Validation](docs/VALIDATION.md) · [Changelog](CHANGELOG.md)

### Themes and listening recaps

Settings includes a visual picker for 13 themes. Choose a palette and **Save audio preferences** to apply it to both windows. Glass uses translucent panels over an aurora background inside the app; it does not reveal other desktop windows.

Open **Listening stats → Your listening, wrapped**, choose start/end dates and a picture style, then **Create my recap**. **Save PNG image** opens the native save dialog. Posters are 1080 × 1440 pixels and use activity recorded on this computer, with both dates included. Music, books, podcast episodes, local files, and radio stay separate. Paused/buffering time is excluded; no older server history is imported. Empty ranges cannot produce a poster. The date range is limited to ten years. Exported images include media titles/creators but no credentials or server addresses.

The mini-player pin button reads the actual native window state and remembers your choice when reopened. Pinning keeps it above ordinary application windows; Windows secure desktop and exclusive fullscreen applications are outside that guarantee.

### Lyrics

Play music, click its artwork to open **Now playing**, then choose **Lyrics**. The app looks up the exact track metadata through [LRCLIB](https://lrclib.net/docs) only while the panel is open. Synced lines follow MPV; click a line to seek. Manual scrolling turns off Follow playback so you can browse freely. Plain lyrics, instrumental tracks, missing matches, and request errors have separate states. No API key is needed. Refresh retries the lookup subject to LRCLIB's rate limit.

Lyrics support Navidrome music and local audio with title/artist tags, never audiobook chapters, podcast episodes, or radio. Main-process requests send title, artist, album and supported duration, never server credentials, file paths or audio. Matching results are cached for seven days, missing results for one hour; the client spaces requests and honours Retry-After. Cached metadata permits repeat Navidrome lookups when the server is unavailable. Word-by-word karaoke, manual result search and embedded lyrics are not implemented.

**Black Glass** uses black and neutral-grey translucent panels with blur. All normal window scrolling stays within the content pane so the player remains at the bottom.
