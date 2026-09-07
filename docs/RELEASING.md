# Windows releases

The installer, app interface and Audiobookshelf client identification all use the version in `package.json`. The project uses version tags such as `v0.2.1`; ordinary commits run checks without creating a release.

## Publish a version

1. Update the version with `npm version patch --no-git-tag-version` (or `minor`, or an explicit version). This updates both package files.
2. Add a matching `## 0.2.2` section to `CHANGELOG.md`, describing the actual changes.
3. Run `npm run release:check`, `npm test`, `npm run build` and the appropriate desktop checks.
4. Commit the changes on `main`. Review staged files; do not include media, databases, test profiles, credentials or build output.
5. Preview with `npm run release -- -DryRun`, then run `npm run release`.

The helper requires GitHub CLI authentication, a clean working tree and an `origin` remote. It refuses existing version tags, creates an annotated tag, and atomically pushes `main` and that tag. It does not commit unreviewed files or move existing tags. If a push fails, inspect the error and retry the existing tag push after resolving it; do not create a different release from the same version.

Alternatively, create an annotated `vX.Y.Z` tag on the reviewed commit and push it explicitly. The tag must exactly match the package and lockfile versions and have a changelog entry.

## What GitHub Actions does

`.github/workflows/release.yml` runs on version-tag pushes, or manually for an existing tag:

1. Checks out the exact tagged commit and validates version consistency.
2. Installs locked dependencies on Windows; runs tests and builds the app.
3. Runs the desktop integration suite against local fixture servers.
4. Builds an x64 NSIS installer with implicit electron-builder publishing disabled.
5. Runs the suite against the packaged executable.
6. Archives corresponding tracked source from that same commit and calculates SHA-256 checksums.
7. Uploads build artifacts and validation screenshots/reports.
8. A separate publish job uses GitHub CLI to create the release and attach the tested assets.

Build jobs have read-only repository access. Only the publish job has `contents: write`, through the automatically provided `GITHUB_TOKEN`; no personal access token secret is required. Failed checks prevent publication. Existing releases are never overwritten. Versions containing a prerelease suffix are marked as prereleases.

Assets are named `Media-Center-X.Y.Z-win-x64.exe`, its blockmap, `Media-Center-X.Y.Z-source.zip`, and `SHA256SUMS.txt`. Installers remain unsigned until a signing certificate is configured. GitHub tests do not claim native MPV hardware coverage; run locally with `MPV_TEST_PATH` for native streaming/audio checks.

## Monitor or retry

```powershell
gh run list --workflow release.yml
gh run view RUN_ID --log-failed
gh run watch RUN_ID --exit-status
gh release view v0.2.1
gh release download v0.2.1 --pattern '*.exe'
```

For a failed build before publication, rerun the failed workflow with `gh run rerun RUN_ID --failed`. The manual workflow dispatch also accepts an existing version tag. If the source needs changing, bump the version and create a new tag instead of moving a published one.

References: [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create), [workflow token permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication).
