# Mobile 1.0.0 implementation ledger

The approved design is retained. Current phone-test build: **1.0.0-rc.1** (Android version code 7). This is an installable release candidate, not a claim of complete desktop parity. Historical notes below describe earlier builds; the latest section supersedes their implementation status.

- [ ] Virtualized infinite library lists with retry and stable identity
- [ ] Expo Router screen stacks and consistent back behavior
- [ ] Embedded MPV original-quality audio and native playback state
- [ ] Background service, audio focus, notification/lock-screen controls, headset handling
- [ ] Queue, seek, repeat/shuffle, volume, sleep timer, favorites and lyrics
- [ ] Navidrome music and playlists
- [ ] Audiobookshelf books, episodes, chapters and progress
- [ ] Jellyfin libraries, music, movies and shows
- [ ] Downtify saved library, discovery, search and streaming
- [ ] Local media and radio
- [ ] Persistent offline jobs and user-selected shared folders
- [ ] Portable M3U8 playlists and selective sync
- [ ] Appearance styles, frosted/glass surfaces, accessibility controls
- [ ] Device output diagnostics and real DAC tests
- [ ] Integration tests, offline/import checks and installable release candidate

## Verified foundation — 2026-11-06

Local candidate is **0.2.0**, not a completed 1.0.0. S23 Ultra, Android 16:

- Original silent WAV streamed through embedded MPV; file-loaded, advancing
  clock, pause, five-second seek and background MediaSession passed.
- Shared-folder original audio SHA-256 matches its server source. UTF-8 M3U8
  uses relative Music paths. Offline playback passed with the fixture server
  disconnected. Import into Poweramp is not yet tested.
- Native book/episode timeline and target-identity unit tests pass. Audiobookshelf
  provider playback is now implemented and has passed the emulator fixture checks below.
- Nine mobile model tests, mobile TypeScript and lint checks pass.
- Desktop TypeScript, 300 regression tests and production build pass.
- Native runtime packaging is pinned to the checksum-verified MPV runtime.
  This fixes the missing C++ floating-point symbol seen on the physical phone.

Implemented but still requiring broader verification: Downtify saved-library
browsing and streaming, favorites/lyrics, style controls, sleep timer and queue
operations. Persistent/resumable download jobs, automatic folder sync, complete
Audiobookshelf/Jellyfin/local/radio integration, USB-exclusive output and the
remaining desktop feature parity are outstanding. Existing 1.0 checkboxes stay
open until their full acceptance criteria pass.

No GitHub publication is authorized by this implementation request. No silent transcoding or alternate playback engine.

## Mobile player revision — 2026-11-06

- Replaced the scrolling, three-tab player with a screen-sized mobile layout.
- Artwork scales within remaining height; the seek bar and transport remain visible.
- Queue, lyrics and playback options open in separate dismissible sheets.
- Queue rendering is virtualized. Favorites use a filled heart and no longer call the Navidrome API for offline media.
- Emulator regression passed native MPV playback, fixed player layout, sheet dismissal and relative seeking. See `EMULATOR.md`.
- Audiobookshelf native provider and UI are implemented for books and expanded podcast episodes; emulator integration verification passed original audio, resume, cross-file seeking and independent episode progress. Real-server breadth and failure recovery remain under verification.
- Full version 1.0.0 remains incomplete; the outstanding integrations and offline-sync acceptance criteria above are still release gates.

Final emulator candidate recheck passed: native book/episode regression and player regression on both the default viewport and a compact 360 × 640 dp viewport. Five native unit tests, nine mobile model tests, mobile lint/typecheck, and 300 desktop regression tests passed. The compact player was visually inspected with all primary controls visible and no page scrolling.


## Content structure and resilience — 0.3.0 candidate

- Network operations now run on a dedicated coroutine I/O scope, away from Expo's single native function queue. Playback polling and healthy providers remain responsive during a source outage.
- Unavailable sources remain in the drawer; the library hub excludes them. Home/Search resolve providers independently.
- Audiobookshelf accepts a bearer API key validated through `/api/me`; existing password sessions remain compatible. Secrets remain in the encrypted native account store.
- Home has configurable/reorderable shelves, recent/frequent listening backed by local SQLite, server favorites and recent albums. Explore aggregates collections; Library offers explicit collection cards; Search groups provider/media results and includes downloaded tracks.
- Floating five-item navigation has no backing strip; lists reserve trailing content space. Album/book artwork is larger.
- Eight palettes and five editable palette colors; bundled fonts preserved. Player artwork blur and lyric size/alignment controls added.
- Decorative seek waves return to the baseline at both ends. Long-form playback has control locking and per-target saved positions.
- Native MPV ReplayGain and a ten-band equalizer are opt-in; defaults do not add processing. No USB-exclusive or bit-perfect claim.
- GitHub stable mobile asset checking and an Android installer handoff are implemented. Downloads must match the official GitHub asset digest, package ID, newer version code and installed signing certificate. Installation requires Android user consent. End-to-end updating awaits a published, appropriately signed newer Android APK; desktop releases are ignored.

Verified during implementation: emulator bearer-key authentication without password login, native music playback, healthy book playback during another provider outage, control locking, book cross-file seeking and independent podcast progress. Desktop typecheck/build and 300 tests pass. Final 0.3.0 packaging and visual checks are recorded separately after completion.

Still outside this candidate: Jellyfin mobile/video playback, USB-exclusive DAC output, complete Poweramp-level DSP, full desktop lyrics customization, automatic background library sync and production release signing/source packaging. This remains a development candidate, not the completed 1.0 release.


0.3.0 verification: 10 mobile model/encoding tests, 8 native Android unit tests, mobile TypeScript/lint, and 300 desktop tests pass. Emulator checks passed music playback, API-key validation with no password login, a deliberately delayed failing provider while healthy audiobook browsing remained responsive, book/podcast cross-file/identity regression, playback-control locking, light/dark palette navigation, audio settings and the live GitHub no-Android-release response. APK download/install/signature rejection remains unverified end-to-end until a newer signed mobile release exists. Final local outputs are `release/mobile/Media-Center-Mobile-0.3.0-preview-arm64.apk` and `release/mobile/Media-Center-Mobile-0.3.0-emulator.apk`. Neither is a published production release.


## Provider-aware Explore and native video — 0.3.1 preview

- Home retains collection snapshots, favorites and local listening history. Explore creates bounded daily music mixes from connected Navidrome/Downtify libraries and adds independent Audiobookshelf and Jellyfin shelves.
- Audiobookshelf shelves preserve book/show distinctions and prioritize matching authors when local history exists. Jellyfin offers continue watching and unplayed library items. These are transparent library-based suggestions, not a trained recommendation model or endless radio.
- Jellyfin native authentication and library/search/detail navigation support music, movies, series and seasons using explicit item types. Original video files play inside a private native MPV screen; the server does not transcode. Resume, absolute seek, five-second controls, embedded audio/subtitle selection and playback-session reporting are implemented. Local listening statistics include video.
- Liquid Glass navigation uses a native Android RuntimeShader to refract the underlying content at its edges, with readable tint and edge lighting. Frosted retains a separate blur implementation. Refraction requires Android 13+; older devices use a simpler fallback. This is an Android interpretation, not Apple's material implementation.
- The dock and mini-player share one floating stack. Root page headings are removed, the fifth destination opens the side menu, and local downloads appear after server collections.
- Existing downloaded music is preferred when playing the corresponding server track; unavailable local files fall back to the server. This does not implement offline caching for books, podcasts or Jellyfin video.

Acceptance evidence: Jellyfin fixture login, collection/detail navigation, original MPV video rendering, server playback-start reporting, resume and five-second seeking passed on the emulator. The test uses an original generated MJPEG clip and fictional credentials; real-server codec/network coverage still requires the user's servers. Final candidate checks and artifact paths are recorded after packaging.

Remaining mobile 1.0 gates include persistent background sync/download recovery, spoken/video offline caching, USB-exclusive/bit-perfect DAC verification, complete desktop feature parity and production signing. External subtitles, video picture-in-picture and automatic next-episode playback are not part of this preview. Real-server tests and phone/DAC tests have not been represented as complete.


## Library and cache redesign — local 0.3.1 work

- Provider-led Library entrances, an ordered cross-provider pinned shelf with media filters, and single-kind music collection screens replace repeated browsing tabs.
- Shared artwork-led detail headers cover music, spoken items and Jellyfin; detail titles appear once, with a glass Back control over the artwork.
- Downtify external Discover uses the existing desktop 3.9 finder contracts for search, artist profiles and discography, album tracks and library-seeded artist suggestions. Saved browsing remains separate.
- Liquid Glass tint and edge refraction are independently adjustable. Frosted continues to use blur. Android 13+ is required for the refraction shader.
- Cache jobs persist their track IDs and status; individual requests can be queued, paused, cancelled and retried. Interrupted jobs reopen paused. Completed original files are retained, unfinished files restart, and M3U8 export occurs only after the whole requested collection completes.
- Opt-in music album/playlist/favorites rules have an item limit and unmetered-network requirement. **Rules check hourly while the application is open**; this is not WorkManager scheduling after process termination. New rules start disabled. No automatic deletion of shared audio occurs when a rule changes.
- Shared folder/playlist interoperability, background scheduling and spoken/video caching still need additional implementation/acceptance work. This is not a mobile 1.0 release.


Verification (2026-11-07): mobile typecheck/lint and 17 model tests pass; 16 native unit tests pass, including Downtify finder contracts and cache state transitions. Desktop typecheck/build and all 300 regression tests pass. The final emulator APK's C++ runtime hash matches the pinned bundled runtime. Real configured Navidrome album browsing/pinning, Downtify suggestions/artist discography, Audiobookshelf podcast detail and Jellyfin series/season/episode detail were checked on emulator-5554. A small real album and individual track were cached in `/sdcard/Music/MediaCenter-Preview`; pause under throttled networking, persistence through update/restart, resume/completion, two relative UTF-8 M3U8 exports and removal of unfinished partial files passed. Emulator network speed was restored. Auto-offline rules were not enabled. Final local emulator artifact: `release/mobile/Media-Center-Mobile-0.3.1-emulator.apk`. No phone installer or GitHub release was published in this pass. Visual captures are in ignored `artifacts/mobile-device/`.


## Feature expansion — 1.0.0-rc.1 phone candidate

Implemented in this pass, retaining the approved mobile screens:

- Desktop-equivalent track sorting (original, title both directions, artist, album, date added both directions, release year, duration, disc/track). Controls are hidden for fewer than two entries. Album/playlist playback follows the sorted sequence and preserves duplicate occurrences; server playlist order is not rewritten. Music search, episodes, cache, local files and Jellyfin music collections share ordering support. Missing metadata sorts last. Full-library custom sorts are bounded; extremely large requests report a limit instead of silently truncating.
- Downtify external Discover track/album server-save actions, separate phone caching, find-similar and artist search, play-next and append-to-queue. Server-save means accepted into Downtify's download queue, not a claim that downloading has finished. The save contract deduplicates identities and skips known saved files.
- Queue reorder, remove and clear-upcoming; upcoming music titles are populated from native browse metadata.
- Audiobookshelf book/episode caching of original physical files into the selected shared folder. Cached books retain whole-book chapter/timeline mapping across files; episodes retain separate identity. Complete manifests are exposed as single cache items. Offline playback stores local resume checkpoints. **Offline spoken progress is not yet reconciled back to the server**, and the player says so.
- Local audio folder indexing via Android's folder picker; originals remain read-only. User-defined direct-stream radio. These use MPV. Filename-based browsing is available; comprehensive local tag/album indexing is not yet implemented.
- Custom plain/LRC lyrics, per-track timing correction, restore automatic lyrics, chapter playback and existing long-form bookmarks/control lock.
- Jellyfin music albums/playlists can play/cache their ordered tracks using the native music queue. Video remains original-file native MPV playback.

Verification:

- Mobile TypeScript and lint pass; 20 mobile model/encoding tests pass, including parity with every desktop sorting comparator.
- 21 Android native unit tests pass, including exact Downtify save/similar request contracts and book-versus-episode physical-file planning.
- Desktop TypeScript, production build and all 300 regression tests pass. Tests requiring local sockets/filesystem fixtures were run outside the restricted sandbox.
- Configured Navidrome single-track album hides sorting; a 14-track playlist sorted Z–A opens a queue in the same order on emulator-5554. Existing accounts and data were retained.
- Fictional Audiobookshelf fixture: original multi-file book cached, played natively and sought to ~90 seconds across its physical-file boundary without an online playback session. Cached episode playback starts independently rather than inheriting the book position. UI automation was resumed after Android killed one accessibility-dump process; the book and episode assertions both passed.
- Server-side download writes were tested against a local fixture, not the user's live Downtify library.

Remaining release gates and material limitations:

- Phone/DAC listening, Poweramp playlist import and broad real-server codec testing.
- Production signing and end-to-end GitHub Android upgrade validation. This APK uses the existing local test signing identity to update prior previews; do not publish it as a production release.
- Scheduled sync after app termination (current rules run hourly while open), video caching, automatic offline-progress conflict reconciliation, persistent queue restoration and complete server playlist editing.
- USB-exclusive/bit-perfect output, Android Auto and Poweramp-level DSP parity are not claimed.
- Local/radio UI and new custom lyrics need broader device acceptance. No iOS build is provided.

Local phone artifact: `release/mobile/Media-Center-Mobile-1.0.0-rc.1-arm64.apk`.
Local emulator artifact: `release/mobile/Media-Center-Mobile-1.0.0-rc.1-emulator.apk`.
No GitHub publication in this pass.

Packaging verification: ARM64 APK version name `1.0.0-rc.1`, version code `7`, minimum Android API 26. APK signature verifies and matches the prior 0.3.0 phone preview, allowing an in-place update. Bundled `libc++_shared.so` matches the pinned native runtime SHA-256. Phone APK SHA-256: `4025d314814162b1567ef655cc247739809193b34411e1c8ed9adec329468eb0`. Real Downtify Discover action-sheet labels were inspected on emulator; no live save/download action was triggered.


### Next UI pass — user-reported queue spacing

Screenshot received after RC1: the full-width “Clear upcoming” action touches the highlighted current-track row, making the two rounded surfaces look joined. Add clear header-to-list spacing and check current-track/action alignment in the queue sheet. User requested retaining this for the next changes; no UI fix is included in RC1.


## Performance pass — 1.0.0-rc.2

- Isolated playback state from the application/preferences context; playback polling no longer refreshes every page, label and artwork component. The mini-player subscribes independently. Identical idle snapshots are suppressed.
- Root navigation switches without a sideways stack animation; detail navigation keeps its existing transition. Re-selecting the current bottom tab does not remount it.
- Home uses a virtualized vertical list with bounded shelf previews. See all opens virtualized complete music lists with incremental album loading. Audiobookshelf See all opens the provider's library browser.
- Added Downtify Favorites based on Media Center hearts for saved Downtify tracks; this does not claim synchronization with an undocumented Downtify favorites endpoint. Separate source shelves remain separate.
- Coalesced concurrent browse/artwork reads and short-lived library caching. Explicit refresh invalidates reads; failed requests can retry. Downtify's library fetch is reused for album, artist and favorite projections.
- Liquid-glass backdrop capture is capped at 15 captures/second and clipped to its visible strip rather than recaptured at every display frame. This is a rendering-cost tradeoff; the current visual design remains.
- Added spacing between Clear upcoming and the current queue row.

The user confirmed actual audio through their USB DAC/IEM on RC1. This is not verification of USB-exclusive or bit-perfect output. The phone disconnected before RC2 testing; emulator checks cannot establish physical-phone smoothness.

RC2 verification: mobile TypeScript/lint and 22 model tests passed; 22 Android unit tests passed. Desktop TypeScript/build and 300 tests passed (socket/temp-file tests outside sandbox). Emulator in-place update preserved connections; root navigation, full Recently added shelf, scrolling and Back passed. A repeated nine-tab sequence improved median frame time from 34 ms to 26 ms and 90th percentile from 65 ms to 48 ms; janky frames remained 26.01% versus 34.14% previously. These are indicative emulator measurements, not phone performance guarantees or proof all stutter is gone.

Phone update: `release/mobile/Media-Center-Mobile-1.0.0-rc.2-arm64.apk`, version code 8. Signature matches the previous preview; bundled C++ runtime matches the pinned source. SHA-256 `a925dc6d2ab1997676ef3171f8f31ec6e61a3c8ad30c1d9f59a0d16e1b058687`. Emulator variant installed on emulator-5554. Phone was not attached, so no RC2 phone installation or DAC test was performed. No GitHub publication.

## November 8 verification checkpoint

Spoken transcript imports/search/cross-file jumps/control lock/removal and source-timestamp-preserving silence skipping have passed emulator checks. Music LRC import/export matched the original 84 bytes, and automatic lyrics were restored. Mobile validation passes 61 JS and 113 native tests. Desktop typecheck, production build and all 300 unit tests pass. Broader Electron UI automation is being updated for existing navigation/recap/artist-page changes; its final result must be recorded separately. The feature ledger still contains 10 partial and seven queued capabilities. This checkpoint is not a complete 1.0 release.


### Final November 8 local checkpoint

The refreshed emulator and phone preview APKs include public-link sharing, bounded saved-library radio, duplicate recording filtering, valid cold playback snapshots and corrected Home music-history navigation. Native playback/queue and Home shortcut acceptance passed on the emulator; playback was left paused. Mobile checks pass 70 JS and 121 native tests. Root typecheck, 300 tests, production build and the complete Electron regression suite pass, including the palette-aware Liquid Glass/Editorial dialog correction. The expansion ledger still has eight partial and seven queued capabilities plus hardware acceptance. These are development-signed local previews; no public 1.0 release or phone installation is claimed.


### Original video cache checkpoint — 2026-11-08

Original Jellyfin video caching, offline native playback/seeking/local resume and non-destructive cache integrity passed generated-fixture emulator acceptance. Mobile TypeScript/lint, 70 JS tests and 159 native tests pass. Cache originals retain their containers, use dedicated video playback and do not upload fictional server sessions. External subtitles are not cached. The idle music checkpoint gate reduces repeated queue work; the physical Samsung crash/long-background test remains OPEN. See EXPANSION-PLAN.md for the unfinished supported scope. No production signing, phone update or GitHub publication is claimed by this development build.


### Progress review / stop-path crash checkpoint — 2026-11-08

Explicit cached Audiobookshelf position review passed generated-book conflict/failure/uncertain-response checks, position-only PATCH, local-only server selection and cached resume. A real empty-track PlaybackService crash was reproduced, fixed and retested with native Stop. TypeScript/lint, 71 JS and 169 native tests pass; both local development APK variants build. Samsung data-preserving installation and the reported audiobook playback passed. The original security failure was not reproduced by that book; the earlier excessive-resource crash still needs longer physical-device observation. Jellyfin offline progress upload and other partial/queued capabilities remain unfinished. No public 1.0 release or permanent-key signing is claimed.


Samsung audiobook acceptance clarification (2026-11-08): the user confirmed the reported audiobook was the item that previously failed with the security message. It now starts and advances normally on the updated physical Samsung. This closes the specific failing-item playback retest; the historical generic message does not establish its original technical cause.
