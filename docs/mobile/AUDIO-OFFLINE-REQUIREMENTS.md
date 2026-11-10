# Mobile audio and offline requirements

Confirmed with the user on 2026-11-06. These are requirements, not completed features.

## Reference device and design

- Samsung Galaxy S23 Ultra, 512 GB, intended as a dedicated player. Exact Android version pending.
- User reports Dunu Titan S2 IEM and a small J Kelly USB DAC, with markings transcribed as CS4319 and SGM82-62. Verify actual USB descriptors and supported formats on device; do not infer capabilities from the transcribed chip name.
- Future USB and Bluetooth DACs must work through capability discovery, not device-name assumptions.
- Retain the approved bundled DM Sans / Sora fonts.
- Next UI pass: eliminate redundant pointer/touch focus outlines, including nested search inputs, while retaining keyboard focus visibility across desktop and mobile.

## Product scope

The primary product is a complete streaming and offline media player. Portable library sync is an additional independent use case, not a replacement for the full app. Selective sync must accommodate libraries larger than the phone, with Wi-Fi and storage policies. Preserve the approved design and fonts.

## Audio acceptance

- Embedded libmpv and a reproducible codec build; no external player installation required.
- Original-quality streaming/downloads by default. No silent server transcoding.
- Distinguish source resolution, decoded output, negotiated device format and verified bit-perfect output.
- Test real USB device routes, rate changes, background playback, unplugging, interruptions and network recovery before claiming support.
- Provide processing-enabled listening separately from a clean output path. EQ, ReplayGain, crossfade and software gain must not be presented as bit-perfect.
- Bluetooth negotiated transport is separate from source resolution. Do not label a route lossless merely because the file is FLAC or the accessory is marketed as hi-res.
- Root must not be required. Test stock Android first; custom ROM behavior needs separate verification.

## Portable offline library

- Distinguish temporary evictable cache from explicit retained downloads. Never automatically evict exported/user-retained files.
- User-selected shared storage destination using Android storage APIs, not an app-private-only layout. Support permissions being revoked and storage becoming unavailable.
- Human-readable folders for Music, Playlists, Audiobooks and Podcasts, preserving media identities and metadata.
- Default: store a recording once, with UTF-8 M3U8 playlists referencing local files via relative paths. Preserve playlist order and repeated entries.
- Optional self-contained playlist export copies selected files beside a playlist for portability, with duplicate storage cost shown.
- No authenticated URLs, server tokens or private app URIs in exported playlists.
- Collision-safe filenames for editions and multiple servers; stable identity mapping remains internal. Do not merge by title alone.
- Resume interrupted downloads where the source supports ranges and validators; verify completion before publishing playlist entries.
- Export reports missing/failed tracks explicitly. Offer complete-only exports or clearly marked partial exports.
- Deleting or refreshing a playlist must not remove shared files referenced elsewhere. Deleting a server must not silently remove retained exports.
- Preserve original tags/artwork. Do not promise third-party recognition until actual imports are tested.
- Acceptance: download a playlist, disconnect all networking, play in Media Center, import in Poweramp and Samsung Music, then copy a self-contained export to a second location and repeat. Include Unicode filenames, repeated tracks, multiple discs, partial downloads and filename collisions.

## References

- https://developer.android.com/training/data-storage/shared
- https://developer.android.com/training/data-storage/shared/media
- https://developer.android.com/media/platform/improve-audio-playback
- https://source.android.com/docs/core/audio/preferred-mixer-attr
