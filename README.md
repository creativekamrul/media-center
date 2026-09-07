# Media Center

A Windows desktop home for Navidrome music, Audiobookshelf books and podcasts, and local audio folders. Built with Electron, React, TypeScript, SQLite, and native MPV playback.

**Version 0.2.1** improves button visibility, episode layouts, keyboard focus, and navigation, and adds automated Windows releases. It builds on playlists, artists, favorites, episode statuses and sorting, Continue Listening, bookmarks, local files, expanded Now Playing, persistent queues, and personal listening plans. The long-term goal is Feishin and Audiobookshelf client parity, excluding lyrics. See the [feature inventory](docs/FEATURES.md) for remaining work.

## Install and connect

1. Run `Media-Center-0.2.1-win-x64.exe` from the release package. Current builds are unsigned.
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
npm run build
npm run test:desktop
npm run package:win
```

For muted native playback tests, set `MPV_TEST_PATH` to your MPV executable. For packaged tests, also set `MEDIA_CENTER_EXECUTABLE` to `release\win-unpacked\Media Center.exe`. Tests use isolated fixture servers and app profiles. Reports/screenshots go to ignored `artifacts/`; installers go to ignored `release/`.

## Release a version

Update the package version and changelog, run checks, and commit on `main`. Run `npm run release -- -DryRun` to preview, then `npm run release` to push the version tag using your authenticated GitHub CLI. GitHub Actions builds and tests the Windows app before publishing its installer, corresponding source, and checksums. See [the release guide](docs/RELEASING.md) for setup and troubleshooting. In-app automatic updates are not implemented.

## Playback and privacy

MPV reads original streams directly. Navidrome requests `format=raw&maxBitRate=0`; Audiobookshelf creates direct-play sessions. The interface never decodes media, receives saved credentials, or buffers complete audio files. Original streaming does not itself certify bit-perfect device output.

Credentials use Electron safeStorage (Windows DPAPI). SQLite stores settings, queues, local tag caches, checkpoints, plans, and history under the app user-data directory. No app analytics service is configured.

Server progress is authoritative on resume. Sync failures are visible and checkpointed locally; automatic offline reconciliation is not yet implemented. Music scrobbling can be disabled independently of Audiobookshelf progress synchronization.

## Contribute and license

Licensed **GPL-3.0-only**. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Distributed modified binaries require corresponding source under the GPL.

[Architecture](docs/ARCHITECTURE.md) · [API contracts](docs/API-CONTRACTS.md) · [Validation](docs/VALIDATION.md) · [Changelog](CHANGELOG.md)
