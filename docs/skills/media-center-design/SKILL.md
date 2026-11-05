---
name: media-center-design
description: Design and refine Media Center's React desktop UI using its Downtify-inspired visual system. Use for app pages, media cards, settings, menus, themes, and listening layouts; preserve existing media integrations and controls.
---

# Media Center interface

The reference is the user's Downtify installation, visually reviewed in October 2026. Its useful characteristics are restrained browsing surfaces, artwork without outer boxes, predictable toolbars, compact track rows, and a spacious artwork-led listening screen. Implement our own components; do not copy branding or replace Media Center's collections with Downtify navigation.

## Composition

- Preserve dedicated sidebar collections, pinned views, library selection, media distinctions, and every existing action. A UI redesign does not authorize deleting functionality.
- Keep the sidebar visually quieter than content. Use a subtle selected surface, an accent icon and the existing small dot. No ornamental selection ribbon.
- Browsing uses stable gutters, clear sans-serif hierarchy and sparse separators. Respect saved font overrides. Artwork and titles should dominate, not nested panels or decorative copy.
- Media cards have unboxed artwork, 10–12px corners, title and secondary metadata below. Keep hover controls keyboard accessible. Maintain distinct book, artist and movie aspect ratios.
- Tabs use an underline. Segmented controls select a local mode. Buttons perform actions. Headings are plain text. Do not give all of these the same pill treatment.
- Ordinary actions have modest rounded corners, 38–42px targets and consistent icon spacing. Playback buttons are circular. One primary action per group; secondary actions use quiet surfaces.
- Context menus use opaque palette-aware surfaces, compact icon/label rows and meaningful dividers. Translucent page surfaces must never make menus unreadable.
- Settings use section navigation and grouped preferences with labels and controls aligned. Preserve draft edits and search navigation. Avoid borders around each label or nested settings cards.

## Listening layouts

- Exactly two choices: Studio and Lounge. Legacy Minimal/Gallery preferences migrate to Lounge while preserving every other preference.
- Studio preserves lyrics on the left, track artwork and queue on the right, with its existing transport placement. Refine spacing and surfaces without reversing the layout.
- Lounge uses large artwork on the left, lyrics or Up next on the right, and a full-width seek/transport footer. Switching panels must not resize artwork. Share controls and playback handlers between layouts.
- Listening controls use translucent, softly rounded surfaces with white readable foregrounds. Keep lyric typography, colors, backgrounds, blur, shade, motion and fullscreen customization functional.
- Backgrounds cover the whole listening canvas at 1080p, 1440p and 4K. Use resolution-independent gradients/particles. Scale blur to the canvas, bleed artwork beyond the edges, avoid visible repeating weather tiles and oversized blurry bitmap textures. Respect reduced motion.

## Implementation and review

`src/renderer/src/design-system.css` owns shared visual structure; palette tokens remain in themes and style tokens in app-styles. `listening-design.css` owns the two listening compositions. Update these sources instead of accumulating per-page override files.

Use palette variables for page foregrounds, backgrounds and contrast pairs. Themes may change color and material, not control semantics or page geometry. Custom CSS remains the final user override. Keep native video hosting geometry separate from decorative surfaces.

Validate representative home, library, details, queue, settings, search, spoken media, Jellyfin and both listening layouts. Include narrow desktop widths, a light palette, frosted and liquid glass, keyboard focus and high-resolution backgrounds. Use isolated test profiles and explicitly labeled fixtures. Run the project checks; distinguish automated layout checks from actual visual review. No publication without a current request.

## Curated styles and continuity

Use the five style presets in `src/shared/styles.ts`: Original, Slate, Paper, Frosted and Liquid Glass. Do not reintroduce a separate palette gallery or retired decorative styles. Keep legacy saved palette IDs readable; selecting a style loads its default colors. Shared controls use 10px corners, while tabs, playback circles and mode segments retain distinct semantics. Dark listening panels define local contrast tokens even in light styles.

Preserve session browsing filters and return scroll positions with the existing hooks. Keep preference drafts explicit with Save/Discard; advanced settings remain searchable. Use the consistency desktop suite for these behaviors.
