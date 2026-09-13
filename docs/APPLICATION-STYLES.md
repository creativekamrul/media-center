# Application styles

Choose **Settings → Appearance → Application style**, then **Save theme**. Selection previews in the main and mini player windows. Leaving Settings restores the saved choice. Original is the default for new and existing profiles and deliberately applies no overrides to the current design.

Styles control component shape, borders, depth, navigation selection and surface treatment. Themes still control the palette; font overrides, density, Solid/Gradient surfaces and the translucent-panels option remain independent. Reset customization resets the theme overrides while retaining the selected application style. Choose Original to reset the style itself.

| Style | Construction | Design references |
| --- | --- | --- |
| Original (default) | Existing pill controls, panels and artwork | Current Media Center design |
| Soft | Rounded tonal controls, broad panel corners and floating cards | [Material shape](https://material-web.dev/theming/shape/) and [elevation](https://material-web.dev/components/elevation/) |
| Precision | Small control corners, fine highlighted edges, layered surfaces and a navigation marker | [Fluent shapes](https://fluent2.microsoft.design/shapes) and [elevation](https://fluent2.microsoft.design/elevation) |
| Outline | Square controls and artwork frames, flat surfaces and ruled rows | [Carbon button structure and states](https://carbondesignsystem.com/components/button/style/) |
| Bold | Heavy outlines, offset hard shadows and pressed-state depth changes | [Neobrutalism components](https://www.neobrutalism.dev/docs) |
| Retro | Beveled buttons, inset fields and classic desktop panel edges | [98.css controls and windows](https://jdan.github.io/98.css/) |

These are original CSS adaptations, not imported component libraries or exact reproductions. No external fonts, scripts or network assets are needed to change styles. No new dependency was added.

## Implementation

- `src/shared/appearance.ts`: validated `appStyle` preference; missing values migrate to `default`. Existing preference persistence, backups and profiles carry the style.
- `src/renderer/src/appearance.ts`: applies the root `data-app-style` attribute through the existing cross-window theme watcher.
- `src/renderer/src/StylePicker.tsx`: six local miniature previews and an accessible pressed-state selector using the existing Settings draft.
- `src/renderer/src/app-styles.css`: scoped component tokens and treatments, loaded after the existing app CSS. Original has no application overrides. Miniature preview tokens are scoped to each miniature. Imported custom CSS retains its existing precedence.

Native window controls retain their drag exclusions and hit areas. Media identity, artwork aspect ratios, track-column sizing, queue scrolling and playback routes are unchanged. Popup menus retain opaque backgrounds and their existing top-layer placement; lyric backgrounds remain controlled by the listening-view preferences. Styles do not enable translucency or animations.

For development verification, build first, then run `npm run test:desktop` with `MPV_TEST_PATH`. `MEDIA_CENTER_APP_STYLES_ONLY=1` selects the focused style checks. Tests use isolated fixture profiles and muted native MPV.
