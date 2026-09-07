# Media Center project rules

## Product and compatibility

- Build an installable Windows desktop application using Electron, React, TypeScript, and MPV. Windows is the first target.
- The full product target is Feishin music feature parity plus Audiobookshelf web feature parity, including audiobooks, podcasts, and management features. Track incomplete work honestly in `docs/FEATURES.md`.
- Lyrics are explicitly excluded by the user. The project license is GPL-3.0-only.
- User's current servers: Navidrome 0.60.3 (34c6f12a), Audiobookshelf 2.35.1. Check version-tagged source/API behavior before adding integration features; the old Audiobookshelf API reference is unmaintained.

## Non-negotiable media distinctions

- Music libraries contain albums and playable music tracks.
- Audiobookshelf `mediaType: book` libraries contain audiobook items. Books have chapter markers and physical audio files; these are separate structures. A chapter can cross files. A file can contain multiple chapters.
- Audiobookshelf `mediaType: podcast` libraries contain podcast shows. Shows contain independently identified playable episodes. A show is not itself playable.
- Always discriminate by explicit server media type, never names, missing fields, or array lengths. Unknown media types fail explicitly.
- Minified podcast responses may omit episodes. Fetch expanded show detail; never reinterpret an empty/missing episode list as an audiobook.
- Book playback needs a book item ID. Podcast playback needs both show item ID and episode ID. Preserve the `PlayTarget` discriminated union; do not introduce a generic `playItem(id)` shortcut.
- Progress/cache identity includes server ID and media kind, plus show/episode identity where relevant. Never share a single progress key across episodes.
- Chapter positions are whole-book seconds. MPV positions are relative to the currently loaded file. Use and test the explicit conversion.

## Architecture and correctness

- Keep credentials, authenticated URLs, network requests, SQLite, MPV process control, and playback state in the Electron main process.
- Local folder playback and radio are separate target kinds. Use `SpokenTarget` for Audiobookshelf APIs, never an exclusion of music alone. Local media access is read-only, canonicalized, and bounded to roots selected through the native picker.
- Keep the renderer sandboxed with a restricted, validated preload bridge. Never expose arbitrary filesystem, shell, fetch, or MPV command access to the renderer.
- MPV is the native playback engine. Do not silently introduce HTML audio or server transcoding as a fallback.
- Preserve original audio by default. Claims about bit-perfect output need hardware verification.
- Await MPV `file-loaded` before claiming a new stream is playing. Command acceptance alone does not mean a file is ready.
- Show synchronization failures and preserve local checkpoints. Do not blindly replay uncertain listening-time deltas or overwrite newer cross-device progress.
- Sample/demo content must be explicitly labeled and separate from real server data. Do not fake playable media or claim unimplemented buttons constitute feature parity.

## Verification

- Run `npm run typecheck`, `npm test`, and `npm run build` for substantive code changes.
- Changes to API models, playback routes, progress identity, or seeking must preserve/add meaningful regression tests covering both books and podcasts.
- Use `npm run test:desktop` for real Electron integration. Set `MPV_TEST_PATH` for muted native audio testing and `MEDIA_CENTER_EXECUTABLE` for packaged application testing.
- Never commit server credentials, user library data, downloaded media, test profiles, or build artifacts.
