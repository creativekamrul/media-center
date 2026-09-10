# 0.8 daily-use release checklist

Local installer only. GitHub publication requires a separate user request.

- [x] Shared track context menus and details
- [x] Reorder/hide Home sections, mix visibility and pinned playlists
- [x] Unified source-separated search
- [x] Compact/comfortable density
- [x] Local playlist editing and M3U import/export
- [x] Automatic local indexing and reliable move matching
- [x] Mix preview/filter/length/regenerate/save
- [x] Optional music-only queue-end autoplay
- [x] Validated byte-range download resume
- [x] Per-show podcast download/retention rules
- [x] Complete personal backups (lyrics, local playlists/favorites, statistics)
- [x] Saved per-song lyric timing offset
- [x] Native Windows media integration
- [x] Customizable app shortcuts
- [x] UI reliability and screenshot regression checks
- [x] Scoped reset controls with native confirmation

Source validation: TypeScript, 140 unit tests, full native-MPV Electron smoke and all new UI flows passed. Reset and Windows SMTC metadata/artwork/timeline have separate integration checks. Packaged native-MPV/UI checks, reset checks and Windows SMTC checks passed with zero renderer errors.

Installer: `K:\media-center\release\Media-Center-0.8.0-win-x64.exe` (152,690,791 bytes).

SHA-256: `9384ab141f7240e14c180068bdc05bbb6a575d757a9cfd30f55ab3ed90c35a69`.
