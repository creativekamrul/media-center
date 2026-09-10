# Default music cover

Asset: `src/renderer/public/assets/default-cover.png`.

Generated with the built-in imagegen edit tool from the user's supplied `cover-art.png`. The original was kept unchanged. The record, grooves and overlapping note preserve the reference composition; peach/champagne and forest charcoal match the app's branding. This bundled asset is used for missing music artwork and can be exported. Local preview 1.1.1 sends its existing public v1.1.0 GitHub URL for Discord fallback artwork, so users do not need to upload their own asset.

Exact edit prompt:

> Edit the provided square default album artwork for the Media Center desktop app. Preserve the exact design, composition, large black vinyl record with concentric glossy grooves, central spindle hole, and the large music note overlapping the upper right. Keep the elegant realistic 3D rendering. Change the bright blue music note to warm peach/champagne #e5bfa4, with subtle cream highlights. Change the navy background to very dark forest charcoal #121817 and make the record highlights neutral or subtly warm. Add the exact words "MEDIA CENTER" in restrained, beautifully spaced warm cream sans-serif typography in the clear lower margin below the record, centered. Maintain generous clear padding and high contrast, no other text or objects. Square output, suitable as a missing-cover fallback.

Artwork search implementation references:

- https://musicbrainz.org/doc/MusicBrainz_API
- https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- https://musicbrainz.org/doc/Cover_Art_Archive/API

No external artwork is bundled from those services. Search and selection are user initiated; selected images are cached on the user's device.

Discord external-image reference: https://github.com/discord/discord-api-docs/blob/main/developers/rich-presence/using-with-the-embedded-app-sdk.mdx
