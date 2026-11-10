# First Android release gates



This checklist distinguishes implemented release work from acceptance checks. The user explicitly authorized publication on 2026-11-07 after supported work and release checks are complete.



## Implemented in the current branch

- Adaptive icon, monochrome icon, notification icon, native splash and branded preparation screen.

- First-run connection/local-audio guide, per-provider skeleton loading and preserved Home content during refresh.

- Landscape navigation rail, expanded library grids, side-by-side detail headers and landscape Now Playing.

- Native media-session/notification artwork with a bounded background executor and stale-track suppression.

- Explicit latest spoken-session resume from the device checkpoint, preserving book/episode identities.

- Local build entry point with bounded native compilation, APK hash generation, separate phone/emulator packaging and fail-closed optional production signing.



## Final signed candidate — November 11

The refreshed phone and emulator APKs built successfully and were signed with the existing permanent key. Independent apksigner, package/version, 16 KB native ELF/ZIP alignment and production test-code exclusion checks pass. The final signed emulator APK installed in place, retained its fictional library and played authenticated generated audio; acknowledged Pause reported an advancing position. Native regression covers the compatibility/timer/notification changes. Older signed hashes later in this document are historical.

- Phone APK SHA256: `f858cfba3fb37fed91898e5cf78cb0b56ba4a0cd0c9e6c258e09fdbb3f475b46`.
- Permanent certificate SHA256: `058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65`.
- Mobile typecheck, lint, 76 JavaScript tests and 248 native tests pass. Native lint has zero errors. Desktop typecheck, 300 tests and production build pass.
- Signing password entry was performed directly by the user in the one-use loopback form. Temporary key material was removed.

## Release acceptance and practical limits — 2026-11-11

The dated sections below are historical evidence. Current supported scope is tracked in [EXPANSION-PLAN.md](EXPANSION-PLAN.md): 56 implemented/expanded capabilities with varying acceptance, one hardware investigation and three excluded/deferred. Implementation and scoped release acceptance are complete; the physical-route limitations below remain explicit.

- Permanent signing and personal-data migration passed on the isolated QA emulator: verified encrypted backup before removal of its disposable development installation, two fictional connections/history and output profile restored under the permanent key, authenticated native playback restored, and signed rc.2 → 1.0.0 in-place installation succeeded. The real Samsung profile was not uninstalled. Media/cache catalogs, jobs and Android folder grants remain excluded from migration.
- Native download/file lifecycle, actual Android folder selection, cache-first playback, integrity and tracked-playlist maintenance passed bounded emulator acceptance. A 345 MB generated background transfer and 10,000-track metadata catalog passed bounded emulator acceptance. Samsung prolonged transfers and a full 200 GB downloaded library remain unmeasured; uninterrupted huge transfers and byte-range continuation are not promised.
- DAC acceptance is closed by the user's November 11 confirmation of the requested listening/unplug/reconnect/screen-off checks. This is user-reported physical evidence, not an agent-observed measurement. It does not establish USB-exclusive or bit-perfect output. Bluetooth/headset button coverage and audible gapless/crossfade quality are not inferred from a general DAC confirmation.
- The signed app's live GitHub check passed and correctly found no newer matching Android release. Seven separate native updater cases passed with deterministic in-process GitHub responses: checksum, truncation, foreign redirect, wrong package, wrong signer, old version and a valid update. Real Android APK parsing, certificate checks, FileProvider and installer updated the disposable helper from code 0 to 42 while retaining its private input. Public GitHub asset readback remains a post-publication check; the positive test did not download a public release.
- Distribution includes the phone APK/checksum, complete app/JNI/build-plugin source, pinned native sources and collected notices. The final source archive is regenerated from the release working tree. The public GitHub assets and updater metadata are verified after upload. A signed-build screenshot below uses only generated QA content.

Multi-item spoken restoration, series-aware continuation, opt-in saved-music WorkManager caching and explicit Audiobookshelf/Jellyfin offline-position reconciliation are now implemented and have bounded emulator acceptance. Earlier notes calling them unfinished are superseded. No blind cross-device overwrite or uncertain listening-time replay is introduced.

## Scope

Android Auto is deferred; device handoff is excluded. Additional widget work is excluded by the user's latest request. Existing widget prototype code does not count as a release acceptance item.



## Device checks completed on 2026-11-07

- Updated the emulator and Samsung phone without clearing data; existing account-backed Home content remained available.

- Samsung expanded media notification displays the album artwork. Active lock-screen media bar also displays the album thumbnail; a paused session did not show that bar in the observed Samsung configuration.

- Landscape Now Playing checked on both emulator and Samsung. Transport, lyrics and queue controls remain present. Phone rotation preferences were restored after testing.

- 49 JavaScript tests and 50 native tests pass; mobile lint/typecheck pass. APK builds succeeded.

- First-run flow is implemented but has not been tested using a fresh isolated installation. The broader offline/background/signing gates above remain open.



### Samsung result after reconnection

Both Samsung notification artwork and the active lock-screen media thumbnail were visually verified on the connected phone. The update preserved existing library content. Landscape Now Playing was also visually reviewed on the physical phone. Playback was paused after the check, and the phone's rotation preferences were restored. No GitHub publication occurred.



- Follow-up: native provider resolution is shared with the download service; restart state preserves user pauses/cancellations. Manual output profiles and tracked-export maintenance are implemented; runtime checks remain required.



## Historical release completion verification — 2026-11-07



- Mobile typecheck/lint and 52 JavaScript tests pass. Native JUnit: 57 tests, no failures. Desktop typecheck/build and 300 tests pass.

- Final native-context emulator build and matching phone preview build succeeded. Both local APKs and SHA256 sidecars are in ignored `release/mobile/`.

- Updated emulator in place without clearing data. Audio processing screen and new output-profile section are reachable; temporary profile save/remove checked. Applying a profile to active hardware remains unverified.

- Download service lifecycle recovery, SAF file/export maintenance and large-library transfer allocation improvements need real interruption/file tests before stable release.

- Public 1.0 remains unfinished: the expansion ledger contains 11 queued capabilities and 12 partial capabilities. No tag, GitHub release or production-signed public APK was created.



## Resumed verification — 2026-11-08



- Mobile typecheck/lint, 61 JS tests and 113 native unit tests pass. Earlier counts above describe historical checkpoints.

- Native picker LRC round-trip, spoken transcript search/cross-file seeks/control lock/removal and bundled Android spoken silence-skipping checks passed using generated/disposable fixtures.

- Paused native picker hold retained the process for 45 seconds with no unchanged MediaSession transport publications. This does not replace the physical Samsung background regression or long screen-off acceptance.

- Scope remains incomplete: 10 partial and seven queued ledger capabilities, plus the hardware investigation. Production signing/upgrade/updater and distribution gates remain open. No stable release or GitHub publication is implied by a successful local preview build.


- Final import validation: empty/whitespace/BOM-only lyrics and transcript files are rejected before changing saved text. CR-only line endings are normalized alongside CRLF. Two added native regression tests bring the current native total to 113 (zero failures/errors).
- Root desktop typecheck/build and all 300 unit tests passed on November 8. Full legacy Electron UI automation reached collection consistency and stopped at an old hidden table-heading selector; that selector and old artist-discography selectors were updated, but the complete UI run is not yet green. Do not report it as passing.

- Local final previews built successfully: `release/mobile/Media-Center-Mobile-1.0.0-rc.2-preview-emulator-arm64.apk` and `release/mobile/Media-Center-Mobile-1.0.0-rc.2-preview-arm64.apk`, each with a SHA256 sidecar. Android apksigner verification passed for both, with matching development certificates. These do not use the permanent production key.
- Installed the final emulator preview in place, launched it and confirmed Home/navigation and existing library artwork load. The disposable spoken fixture is absent. The phone preview was built but not installed or tested on a physical device in this pass.


## Final local radio preview checkpoint — 2026-11-08

- Mobile typecheck/lint, 67 JS tests and 121 native JUnit tests pass. Includes the cold-state playback JSON regression and saved-recording duplicate filtering.
- Emulator radio acceptance passed from a fresh app process: native playback, a 30-track saved queue, labeled same-artist fallback, distinct visible selections and pause. Existing connections remain present; no fixture connection was added for this check.
- Both `release/mobile/Media-Center-Mobile-1.0.0-rc.2-preview-arm64.apk` and the `preview-emulator-arm64.apk` variant built successfully. SHA256 sidecars and the ignored verification JSON describe the exact artifacts. Both verify with the same development certificate; the permanent production key was not used.
- The corrected emulator preview is installed in place. The phone APK has not been installed or accepted on Samsung in this session. Long background/crash, USB output, signing/upgrade/updater, distribution and unfinished feature-scope gates remain open.
- Full desktop UI automation has been updated for the existing semantic table headings, current five styles, actual recap designs and selection-dependent controls. Its final overall result is recorded separately below; earlier unsuccessful runs are not proof of a product regression or a full pass.

- Additional cleanup found Home history entries labeled `music` being routed as albums. Home now normalizes explicit native music history to track playback while retaining separate Audiobookshelf book/show types; unknown/cross-media kinds fail explicitly. Three model tests bring the JS total to 70. Both local APK variants are being refreshed for this final correction.
- Desktop contrast regression identified a hard-coded Liquid Glass dialog/menu background conflicting with the light Editorial palette. Dialogs now follow the active panel palette; menus use its opaque surface. Typecheck, 300 unit tests, production build and the settled 70-combination artwork/lyrics contrast check pass. Separate multi-library playback, current player controls and appearance/reconnect/long local-playlist checks pass. Full combined regression result follows.


### Completed local acceptance for this checkpoint

- Final mobile TypeScript/lint, 70 JS tests and 121 native tests pass. Both refreshed APK variants built and passed apksigner verification with matching development certificates. The emulator variant was updated in place without clearing connections.
- Home history shortcut acceptance passed: a native `music` entry opened Now Playing, played through native MPV, advanced to eight seconds and was paused. It no longer requests an album with the track ID.
- Root TypeScript, all 300 tests, production build and the complete `npm run test:desktop` run pass: production Electron, two fixture servers, all three core media distinctions and zero renderer errors. The corrected Liquid Glass/Editorial lyric dialog was also visually inspected.
- Scope is still unfinished: eight partial and seven queued ledger capabilities remain, alongside the USB investigation and physical-device/distribution acceptance gates. No stable version, GitHub tag, commit or public release was created. These local preview APKs are not proof that all 60 approved capabilities are finished.


### Podcast inbox checkpoint — 2026-11-08

- Mobile typecheck/lint, 70 JS tests and 131 native JUnit tests pass. Emulator development build succeeds. A source-derived local Postman simulation verified inbox read-only scans, filters, duplicate prevention, restart persistence, outage/recovery, cancellation and an explicitly requested original-file cache transfer.
- Generated test inbox/rule/cache copy/connection were cleaned up; existing connections preserved. Automatic checks are foreground-only, not Android scheduled background work. No GitHub publication or stable 1.0 claim. The physical Samsung crash/long-background regression remains OPEN.


### Series and upcoming-cache checkpoint — 2026-11-08

- Mobile TypeScript/lint, 70 JS tests and 142 native tests pass; emulator builds succeed. Read-only audiobook series acceptance confirmed order, completion state and correct next-book navigation. Generated music acceptance confirmed Off/paused safety, exact next-three original downloads and native event updates to the already-open Cache screen.
- Generated file copies and fixture connections are removed; Cache policy and predictive caching are restored to their prior settings. Existing real connections are preserved. These checks are emulator/source-derived fixture evidence, not Samsung crash, long-background, USB output or production-updater acceptance.
- Current unfinished scope is explicit in the expansion ledger. No stable release or GitHub publication is implied.


### Original video cache checkpoint — 2026-11-08

Original Jellyfin video caching, offline native playback/seeking/local resume and non-destructive cache integrity passed generated-fixture emulator acceptance. Mobile TypeScript/lint, 70 JS tests and 159 native tests pass. Cache originals retain their containers, use dedicated video playback and do not upload fictional server sessions. External subtitles are not cached. The idle music checkpoint gate reduces repeated queue work; the physical Samsung crash/long-background test remains OPEN. See EXPANSION-PLAN.md for the unfinished supported scope. No production signing, phone update or GitHub publication is claimed by this development build.


### Progress review / stop-path crash checkpoint — 2026-11-08

Explicit cached Audiobookshelf position review passed generated-book conflict/failure/uncertain-response checks, position-only PATCH, local-only server selection and cached resume. A real empty-track PlaybackService crash was reproduced, fixed and retested with native Stop. TypeScript/lint, 71 JS and 169 native tests pass; both local development APK variants build. Samsung data-preserving installation and the reported audiobook playback passed. The original security failure was not reproduced by that book; the earlier excessive-resource crash still needs longer physical-device observation. Jellyfin offline progress upload and other partial/queued capabilities remain unfinished. No public 1.0 release or permanent-key signing is claimed.


Samsung audiobook acceptance clarification (2026-11-08): the user confirmed the reported audiobook was the item that previously failed with the security message. It now starts and advances normally on the updated physical Samsung. This closes the specific failing-item playback retest; the historical generic message does not establish its original technical cause.


Physical Samsung stability checkpoint (2026-11-08): the loaded, paused audiobook service retained the same PID and unchanged paused media-session timestamp/position for 498 seconds, including a two-minute screen-off observation in Samsung Dozing / DOZE_SUSPEND. Native media Stop also retained the process without the reproduced null-track exception. PSS settled from approximately 421 MiB to 348 MiB and Binder object counts decreased. This is bounded acceptance, not an all-day battery/background or USB-exclusive audio claim.


Video export correction acceptance (2026-11-08): 171 native tests pass; a generated video transfer now completes the M3U8 export step and the exported relative Videos path resolves to its original file. Both local development APK variants have been refreshed and the Samsung updated in place. A generated music export preserves four occurrences sharing one original. Removing one emulator cache entry rewrites its tracked export to three entries and retains that shared original. Physical Poweramp import is still being checked; visible raw filename entries without duration are not recorded as resolved playback.


Physical portable-playlist acceptance (2026-11-08): an actual Media Center native export with four occurrences sharing one original WAV was copied to a disposable selected folder on the Samsung. Poweramp resolves four 30-second entries and a two-minute total without a Play action. Its existing six-second short-track filter was left unchanged; that filter excluded the initial five-second test fixture. Emulator removal also rewrote a tracked export to three entries while retaining the shared file. This closes the actual third-party import check for the generated fixture; legacy untracked exports remain outside automatic maintenance.


Scheduled music-cache checkpoint (2026-11-08): opt-in native WorkManager rules passed a cold-process API 37 emulator check using generated music: one absent original downloaded, three originals reused, export completed, worker SUCCESS. A restricted background foreground-service start was discovered and replaced with bounded regular work using ownership-tagged transfers. Seven-minute/cancellation pauses never claim manual jobs. Android policy/quotas and force-stop still apply; no overnight Samsung or reboot claim. Native tests total 181; mobile JS tests total 71. The public-release gate remains open for other unfinished supported scope.


Emulator checkpoint (2026-11-10): 76 JS tests, 192 native tests, typecheck/lint and the release-variant development build pass. Spoken multi-item session persistence/lazy session resolution, foreground automatic mix generation with restart/HTTP 503 preservation, and Jellyfin playlist private create/reorder/permission/stale/uncertain-write acceptance pass with generated local fixtures. The latest emulator preview is installed without clearing original connections. The Samsung was not used at the user's request and remains on its earlier build. Phone interruption/headset checks, gapless/crossfade, full migration, Jellyfin offline progress and other unfinished ledger scope still block a complete public release. No production signature, GitHub tag or publication was created.


Jellyfin progress checkpoint (2026-11-10): explicit original-video position review passed generated cached-playback/outage, stale-preview, rejected-write, applied-but-error, use-server and confirmed-use-phone emulator acceptance. Cached-source identity and pending native report guards are covered. Final native count is 199, JS count 76, with typecheck/lint and emulator APK build passing. The current local emulator artifact includes this checkpoint; the physical Samsung remains on its earlier build. This is not production signing or a completed public release.

Final emulator cleanup (2026-11-10): generated mix recipe/snapshot, three initial QA connections, generated video cache copy and final video QA connection were removed through app controls. All four original connections and pre-existing cached music/book/episode records were retained. Local simulations and ADB test forwarding were stopped. The latest emulator preview is installed and running; its SHA256 is d8c4c490fd15e54898b613155bedd88402e3665efaa26f2596e9e9b77f9e6c1a, with the existing development certificate. The Samsung-compatible artifact was not rebuilt or installed in this emulator-only checkpoint.

### Gapless, crossfade and supported Downtify edits — 2026-11-10

Native music transitions and Downtify 3.9.0 manual-playlist editing passed the generated emulator acceptance documented in EXPANSION-PLAN.md. Final typecheck/lint and 76 JS tests pass; the final native build has 222 tests with zero failures/errors. Desktop typecheck, 300 tests and production build pass. The removed-source saved-music helper also prevents an invalid Home resume shortcut while preserving configured/unreachable sources and valid queue positions.

The refreshed development-signed emulator APK was verified and installed in place; SHA256 `9b5bfef3557634d18dd5638ef9b941fc874ffb0bfd6e5c4a4b4d78f8ae33e698`. The phone was neither rebuilt nor installed during this emulator-only checkpoint. No commit, release tag, public APK or permanent-key signing occurred. The current remaining gates above still apply.


## Samsung and final preview checkpoint — November 10, 2026

- Updated the Samsung SM-S918B (Android 16) in place with the same development certificate; its four existing provider connections remained intact. No application data was cleared.
- Played a real Navidrome music track. Native Android MediaSession reported Playing with advancing position; media Play/Pause and a stable paused position passed.
- A separate, DUMP-permission-protected test Activity obtained real transient Android audio focus. Media Center paused, remained paused after focus was abandoned, and resumed on an explicit media Play command. The helper was removed afterwards; it never accessed the user's app data.
- Mobile typecheck/lint and 76 JavaScript tests pass after the final UI grammar correction. The final matching emulator APK build succeeded with 248 native tests and zero failures/errors; its development certificate is unchanged. Emulator APK SHA256: c6984a772c8e5456c099adbb6d061fd95e796354be4c008c49ec93cd91e4e0e5.
- The local source collector retrieved and SHA256-verified 22 pinned MPV/FFmpeg/dependency source archives, including nested upstream submodules. A native source collection exists in ignored release/mobile/. The transitive notice inventory and C++ runtime notice review remain distribution work; source collection alone does not close that gate.
- An eleven-minute real-music playback run remained Playing and survived repeated track transitions. Continuous screen state was not sampled, and a later check showed Awake, so that run is not counted as prolonged screen-off acceptance. A corrected, power-state-monitored screen-off check is tracked separately. DAC/headset listening is a user check after disconnecting USB: the user has no simultaneous USB-computer/DAC hub. No exclusive USB or bit-perfect claim is made. No public release has been published.


Signing checkpoint — November 11: the existing Bitwarden PKCS12 bytes matched their saved SHA256. Browser password-field reads return a redacted placeholder, so no successful permanent-key signing is claimed. A one-use, Origin/capability-checked loopback form is prepared for direct user password entry. The current Samsung installation remains development-signed; it has not been uninstalled or replaced with another certificate.


Physical check detail — November 11: the corrected screen-off monitor sampled real Dozing state and advancing music position through 97 seconds. The phone was Awake at 112 seconds while playback was still Playing; the check stopped rather than claiming a three-minute pass. Android's last wake reason was 4. Playback was left paused, Repeat Off restored, and stay_on_while_plugged_in restored to its original 0. Continuous longer screen-off and actual DAC/headset/Bluetooth listening remain open.

Distribution inventory detail: the resolved release graph contains 161 external Maven components and the conservative production npm lockfile inventory contains 560 packages (including toolchain dependencies that are not necessarily bundled in the APK). License metadata is recorded for all of them. Full notice-text review remains separate from a metadata inventory. Exact LLVM/libc++/libc++abi notices for the bundled runtime's recorded Android LLVM revision have been collected.


Permanent-key checkpoint — November 11: the correct password entered by the user signed and verified a local rc.2 candidate with the existing Bitwarden identity. The first submitted password was incorrect; the key was not replaced. Certificate SHA256 is 058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65. Development-to-permanent migration and signed-to-signed update acceptance are still separate steps. No public release or phone replacement occurred.


## Signed candidate and user DAC acceptance — November 11, 2026

The user confirmed the DAC checks previously requested in chat. Mark those checks complete as user-reported; do not reinterpret this as an exclusive-output measurement or a Bluetooth/headset-control test. Earlier bounded screen-state observations remain historical agent evidence.

All three local candidate APKs were signed with the existing permanent Bitwarden identity. Independent apksigner/version/native-packaging checks passed. The signing form lost its browser response after completion and was shut down; no further password entry is required. The final phone APK is `release/mobile/Media-Center-Mobile-1.0.0-arm64.apk`, versionCode 9, SHA256 `73037b713058197dc58c1b4474736678c3abcc941d488be0e5d1574e2552bbd0`. The emulator package remains a separate local test artifact.

The source archive contains 22 pinned dependency source archives plus build/patch/license metadata. The notice archive contains 513 npm and 161 resolved Maven component records and 712 notice/metadata entries. Checksums and every ZIP member's CRC passed. These archive checks establish integrity, not a claim that the remaining distribution review has been completed.


### Final updater pipeline — November 11

A test-only Activity replaced HTTPS responses in its own process; no production endpoint override or bypass was added. The production updater rejected corrupt, truncated, untrusted-redirect, wrong-package, wrong-signature and old-version candidates, deleting each rejected download. A valid same-signer, higher-code fixture reached Android's installer and was installed in place. The pre-install results and preserved private input confirmed the pipeline. Android recreated the test Activity after updating; its second check correctly found no newer fixture. The disposable test package and temporary QA signing key were removed. Play Protect's global settings were not changed.

The actual signed application separately passed an unauthenticated GitHub release-list check. The complete project/JNI/build-plugin source collection was generated from current source files and locked dependency metadata, excluding ignored profiles, downloaded media, keys and build artifacts. Release files remain local and no GitHub publication is implied.


### Bounded transfer, catalog and collection acceptance — November 11

A separate test UID completed a 345,600,044-byte generated original in 345 seconds while backgrounded. Its native recorded hash and an independent device/host original hash matched. Paused/cancelled jobs remained unchanged. Selected observed process samples ranged from about 55 to 71 MB PSS; there was no whole-file allocation. The test harness's final filename quoting was corrected before independent verification; the media did not need to be downloaded again. The test UID and generated media were removed.

The signed QA app browsed a generated 10,000-track catalog advertising 209,715,200,000 bytes. After 32 scroll gestures, Android reported 176 UI hierarchy nodes and process PSS samples of 196452, 214919, 244632, 255248 and 256940 KB. No media stream request occurred during browsing. This is emulator metadata scale, not storage of 200 GB, a Samsung frame-rate result or overnight reliability proof.

Collection text search, hiding sort for a single result, full-catalog Z–A sorting and two-track bulk selection passed. The saved app playlist played through native MPV in the selected sorted order, then was removed. Listening-session preset create/apply, cold-process persistence and removal passed. OS Play/Pause/Next/Previous commands passed after explicitly awaiting native acknowledgements. These checks preceded the final compatibility/timer refresh; the changed paths have separate regression checks.
