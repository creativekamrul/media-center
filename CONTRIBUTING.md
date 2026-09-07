# Contributing

Contributions are welcome under GPL-3.0-only. Contribute only work you have the right to license. No separate contributor license agreement is configured.

Use Windows and Node.js 22+, run `npm ci` and `npm run dev`, and supply your own MPV. Use test accounts and isolated fixture profiles. Never commit credentials, private exports, media files or app databases.

Required checks: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:desktop`. Set `MPV_TEST_PATH` for playback changes. For distribution changes, package and set `MEDIA_CENTER_EXECUTABLE` to test the packaged executable. Update documentation and `docs/FEATURES.md` with behavior changes.

Read `AGENTS.md`. In particular:

- Book chapters, physical files, shows and episodes are different entities.
- Secrets, URLs, SQLite, filesystem operations and MPV stay in main. Extend the typed preload API with runtime validation.
- Use `SpokenTarget`, not “all targets except music.” Local files and radio are also playable.
- Test multiple episodes from the same show and exact progress routes.
- Verify version-tagged upstream contracts, including empty responses, pagination and permissions.
- Preserve original media and await MPV file-loaded. No browser audio fallback.
- Do not blindly replay uncertain listening-time deltas.
- Local folders are read-only and root-bounded after canonical path resolution.
- Document incomplete features honestly. Lyrics are intentionally excluded.

For releases, follow [Windows releases](docs/RELEASING.md). Update package/lockfile versions, changelog and validation; the interface and client identification read the package version automatically. The GitHub Actions workflow builds and tests each version tag, then publishes the installer, corresponding GPL source, and checksums. Releases include updater metadata. Run `npm run test:updater` for updater changes, and keep download and installation explicit user actions. Signing is not configured.
