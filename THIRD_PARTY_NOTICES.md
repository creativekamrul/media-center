# Third-party notices

Media Center is GPL-3.0-only. Dependencies retain their own licenses; distributed package notices are authoritative.

| Component | Role | Upstream |
|---|---|---|
| Electron | Desktop runtime | MIT plus Chromium/bundled notices — https://github.com/electron/electron |
| React / React DOM | Interface | MIT — https://github.com/facebook/react |
| Lucide | Icons | ISC — https://github.com/lucide-icons/lucide |
| Zod | Validation | MIT — https://github.com/colinhacks/zod |
| music-metadata | Audio metadata | MIT — https://github.com/Borewit/music-metadata |
| Node.js / SQLite | Runtime/storage | Node MIT with bundled notices; SQLite public domain — https://github.com/nodejs/node |
| MPV | User-supplied engine | Separate GPL/LGPL installation depending on build — https://mpv.io/ |

Build/test dependencies include TypeScript, Vite, electron-vite, Vitest, Playwright and electron-builder under their upstream package licenses. The lockfile records versions. Electron distributions retain Chromium notices. Preserve required notices and provide corresponding application source when distributing GPL binaries.

Feishin, Navidrome and Audiobookshelf are independent projects. Their source/API documentation informed interoperability research. This project is not affiliated with or endorsed by them. Feishin application source, branding and artwork were not copied into the application.
