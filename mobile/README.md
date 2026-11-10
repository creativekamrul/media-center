# Media Center mobile preview

The first mobile milestone is a touch-oriented design prototype of the [approved listening and library board](../docs/mobile/concepts/listening-and-library.png). It runs from a single HTML file and includes its fonts and original demo artwork.

From the repository root on Windows:

```powershell
npm.cmd run mobile:build
```

Open `mobile/dist/Media-Center-Mobile.html` in your browser. For an actual phone on the same trusted Wi-Fi, run:

```powershell
npm.cmd run mobile:preview -- --lan
```

Open the printed LAN address on the phone. Windows Firewall may ask to allow the preview server on the private network. Stop the server with Ctrl+C. Without `--lan`, it listens only on the PC. The preview server serves one file.

## Review flow

1. On Explore, swipe the featured release or use the slide dots. Open its title, then go Back.
2. Tap Play on a release. Inspect the artwork, seek rail and controls. Heart a song and find it on Home.
3. Open Lyrics for “Night Transit.” Tap a lyric line to seek, open Up next, and select the following song.
4. In Library, filter by source and open a playlist card. Search by song, album, or artist.

All catalog data is fictional. Playback simulates the timeline silently. Playback state lasts for the open session. Pinned library views, their order and the bundled typography choice are saved on this device when browser storage is available. The player includes track details and a sleep timer that pauses the simulated timeline. Audiobooks, podcasts and video views are explicitly empty until native server connections are implemented. The source picker filters the demo collection. Server authentication, native MPV playback, downloads, background playback and OS lock-screen controls are future milestones.

For development use `npm.cmd run mobile:dev`. To exercise the offline review file with the repository’s existing Electron/Playwright tools, build it and run `npm.cmd run mobile:test`. No Android SDK is needed for those commands.

## Next milestone

Build the first native Android development client and test on a physical phone. The acceptance flow is secure Navidrome sign-in, original-stream playback, lock-screen pause/resume and seek, handling an interruption, and recovering from a network change. Validate a Jellyfin direct-play video with selectable subtitles before expanding the codec support claim. Keep book positions, chapter offsets and podcast episode identities separate as in the desktop client.
