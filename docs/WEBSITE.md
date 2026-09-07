# Project website

The landing page is published at **https://creativekamrul.github.io/media-center/** using GitHub Pages. Its source is `site/`: plain HTML, CSS, JavaScript, and reviewed screenshots. It uses no framework build, remote fonts, or analytics scripts. Relative asset URLs support the repository's `/media-center/` base path.

## Preview locally

From the repository root, run:

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:8080/`. Check desktop and mobile widths, keyboard gallery navigation, screenshot enlargement/Escape, FAQ disclosure, and download/documentation links. With JavaScript disabled, all screenshot figures and the rest of the content remain available. Reduced-motion preferences disable the intro animation and smooth scrolling.

## Publish

The repository's Pages publishing source is **GitHub Actions**. `.github/workflows/pages.yml` deploys changes to `site/` from `main`, or can be started manually as **Project website**. Only `site/` is uploaded; app builds, profiles, logs, and the rest of the repository are excluded. README-only changes do not need a Pages deployment unless they change shared assets.

This is independent of desktop releases. Website/documentation edits do not require an app version bump or a new installer tag. Download buttons lead to the latest stable GitHub release. If the owner/repository or domain changes, update canonical/Open Graph URLs, sitemap/robots URLs, and README links.

## Screenshots

Screenshot files are shared with the main README from `site/assets/`. Review every image before committing. Only publish sample collections or controlled test data, with the visible captions preserved. The [asset provenance](../site/assets/README.md) records the origin of each screenshot. Never publish private server data or credentials.
