# Changelog

## 0.2.2

- Added Settings → App updates: check GitHub stable releases, download with progress, and restart to install.
- Download and installation are explicit actions; ordinary exit never installs. Playback sessions and queues are saved before installation.
- Added restricted update IPC, retryable errors, SHA-512 verification, corrupt-download and downgrade regression checks.
- GitHub releases now include verified updater metadata and remain drafts until every asset has uploaded.
- Version 0.2.1 and earlier need one manual installer upgrade to receive the in-app updater.

## 0.2.1

- Improved control contrast, readable text, larger buttons and visible seek/volume handles.
- Aligned playlist playback actions, grouped episode status/actions into readable cards, and improved small-window layouts.
- Fixed inherited scroll positions when opening details or changing screens, stale detail requests, and stretched queue action columns.
- Added version-tagged GitHub Actions Windows builds, packaged smoke checks, source archives, SHA-256 checksums, and release publication using GitHub CLI.
- Centralized the UI/server client version on package.json.

## 0.2.0

- Navidrome albums/songs/artists/favorites/genres/recent/most-played/radio views, playlists and track selection, ordered duplicates, favorites and ratings writes.
- Audiobookshelf Continue Listening, independent episode statuses, completion/reset, library and episode sorts/search, server book bookmarks.
- Local-folder browser, cached tags/formats, embedded artwork, native playback.
- Expanded player, editable persistent queue, Listen Later plans, device history, ReplayGain, ten-band EQ, themes and optional tray behavior.
- Preserved raw playback and whole-book seeking. Listening time excludes MPV buffering; manual status writes flush active playback first.
- GPL-3.0-only licensing, user/developer/security/API documentation and expanded regression/native integration checks.

## 0.1.0

First Windows desktop preview with separate music/book/podcast domains, encrypted connections, SQLite checkpoints, native MPV, covers, browsing and sample previews.
