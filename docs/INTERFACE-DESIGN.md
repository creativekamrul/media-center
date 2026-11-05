# Interface design

The current redesign takes visual cues from the user's Downtify installation: quiet navigation, artwork-led cards, compact actions, clear tabs, and an immersive player without nested panels. Existing integrations and media behavior are preserved.

## Shared rules

- `src/renderer/src/design-system.css` owns shared page composition and control geometry. Keep changes there instead of adding another page-specific override sheet.
- Palettes, saved fonts, custom colors and user CSS remain independent of layout. Material styles affect surfaces; tabs, action buttons and headings retain distinct roles.
- `src/renderer/src/listening-design.css` owns the Studio and Lounge compositions. Studio keeps lyrics left and artwork/queue right. Lounge places artwork left and lyrics or Up next right, above shared transport controls.
- `PlayingBackdrop.tsx` observes the listening canvas so blur and weather travel scale with its dimensions. Gradients and precipitation are CSS-rendered. Honor both the app motion setting and system reduced motion.
- New profiles use sans-serif headings. Existing font selections are not silently replaced.

The reusable [design skill](skills/media-center-design/SKILL.md) contains the detailed guidance. A discoverable copy is installed in the user's Codex skills directory.

## Review commands

Use `npm run typecheck`, `npm test`, and `npm run build`. Desktop scripts use isolated profiles and labeled fixture media; set `MPV_TEST_PATH` to a local MPV executable.

- `MEDIA_CENTER_REDESIGN_ONLY=1 npm run test:desktop`: every sidebar destination with default, frosted and liquid materials, plus narrow layouts.
- `MEDIA_CENTER_STYLES_ONLY=1 npm run test:desktop`: collection actions, both listening layouts, queue switching, saved appearance and all nine backgrounds at 3840×2160.
- `MEDIA_CENTER_CONTROLS_ONLY=1 npm run test:desktop`: transport, fullscreen exit, volume, seeking and audiobook/podcast controls.
- `MEDIA_CENTER_RELEASE_UI_ONLY=1 npm run test:desktop`: theme combinations and the remaining library/UI regressions.
- `MEDIA_CENTER_JELLYFIN_ONLY=1 npm run test:desktop`: embedded native video and Jellyfin regression coverage.

These environment assignments describe the variables; in PowerShell use `$env:NAME='value'` before the command. Run native window suites sequentially to avoid focus interference. Set `MEDIA_CENTER_EXECUTABLE` to the packaged application to repeat checks against a local installer build.

## Consistency contract

The public style catalog is Original, Slate, Paper, Frosted and Liquid Glass. `src/shared/styles.ts` defines their palettes and maps retired style identifiers for compatibility. Selecting a style loads its palette; custom colors, density and fonts remain editable. Old palette IDs stay supported for saved preferences, but are no longer a second picker.

`design-system.css` owns shared button geometry (10px action corners), focus, menus, toolbars and page states. Keep navigation tabs distinct from local segmented modes. Dark listening canvases have their own contrast tokens, even in Paper. `app-styles.css` contains preview styling rather than another competing component skin.

Browse filters and scroll restoration are session-only; do not use them for credentials or server data. Preference drafts are not auto-saved. Advanced sections remain mounted so Settings search can reveal and focus their controls.

`MEDIA_CENTER_REDESIGN_ONLY=consistency npm run test:desktop` checks the five styles, responsive detail pages, keyboard menus, selection actions, settings draft recovery, advanced search and return navigation.
