# Mobile expansion — approved scope



User approved the 60-item proposal with Android Auto deferred and device handoff excluded. Widgets were subsequently excluded from additional work, leaving 57 active items. Keep the approved mobile UI. Add tonal EQ presets and user-editable/saved profiles; these are not headphone compensation profiles. GitHub publication was explicitly authorized on 2026-11-07, conditional on finishing the supported scope and passing release checks. Authorization does not establish readiness.



This is a work ledger, not a claim of shipped parity. Implemented rows still require their acceptance checks.



| # | Capability | Status |

|---|---|---|

| 1 | Custom mix builder | Implemented; model tests and emulator generation passed |

| 2 | Automatically refreshed mixes | Implemented foreground-only daily/weekly refresh with bounded shared scans, persisted native snapshots, cancellation/revision guards and failure backoff. Emulator automatic generation, cold restart and HTTP 503 snapshot preservation pass. Closed-app scheduling is not claimed. |

| 3 | Familiarity control | Implemented; rule regression tests passed |

| 4 | Cross-library mixes | Implemented; identity tests and emulator playback passed |

| 5 | Artist and track radio | Implemented bounded saved-library radio across Navidrome, Downtify, Jellyfin music and device files. Related-artist metadata enriches saved-library searches; unsaved discovery IDs are excluded. Model/native tests pass; cold-start native playback and a duplicate-filtered 30-track emulator queue passed. |

| 6 | Recommendation explanations | Implemented per-track reasons for daily music recommendations: favorite, previously played, familiar artist or unplayed saved-library pick. |

| 7 | Recommendation feedback | Implemented hide-track/hide-artist feedback for daily music recommendations, with reset; identity tests passed |

| 8 | Smart queue continuation | Implemented native opt-in music continuation across saved music sources, source-scoped duplicate/feedback filtering and artist spacing. Repeat, sleep timers, clear-upcoming and stale-result guards retained; native tests pass. Actual native generated-media continuation, duplicate suppression and clear-upcoming cancellation passed on the emulator on November 11. |

| 9 | Session presets | Implemented saved speed/volume/sleep-duration presets; validation tests and emulator create/apply, cold persistence and removal pass. |

| 10 | Discovery inbox | Implemented source-scoped saved tracks/artists/albums from Explore and Downtify Discover, review state, search, removal and source reconnect checks. Model tests pass; runtime acceptance pending. |

| 11 | Unified artist pages | Implemented shared saved-library artist view for Navidrome, Downtify and Jellyfin; matching names retain separate source/profile identities; model tests pass; runtime checks pending. |

| 12 | Duplicate/version grouping | Implemented conservative track-version grouping in central search; model tests passed; UI verification pending |

| 13 | Preferred-source rules | Implemented preferred search source and opt-in conservative native fallback for resolution and opened-stream failures. Matching title, artist, album and duration required; one stream fallback, source identity retained, output errors/spoken/downloads excluded. Generated native resolution and opened-MPV-stream failure acceptance passed with an exact cached alternate; default-off, download/spoken exclusions and version mismatch checks passed. |

| 14 | Advanced search filters | Implemented source/type/year/duration filters on returned search results; model tests passed |

| 15 | Search inside collections | Implemented music collection and spoken episode/chapter search; music text-filter and single-result-sort visibility checks passed on the emulator. Spoken transcript/search acceptance is recorded below. |

| 16 | Custom collections | Implemented named collections of cross-provider pins; emulator create/add/restart/delete passed |

| 17 | Provider playlist editing | Implemented supported native edits for Navidrome, Jellyfin 10.11.11 and Downtify 3.9.0. Navidrome preserves duplicates; Jellyfin refuses duplicate replacement and retains sharing. Downtify manual playlists support create, append/remove and owner rename, with revisions and explicit edit grants. Generated emulator create/edit/stale/read-only/applied-error checks pass. Downtify’s endpoint does not support arbitrary existing-song reordering; app playlists provide custom order/repeats. |

| 18 | App-managed cross-server playlists | Implemented local app playlists; model tests and emulator persistence passed |

| 19 | Bulk actions | Implemented loaded-track selection and queue/cache/save-as-playlist actions. Two-track selection, app-playlist save and ordered native playback passed on the emulator; native cache acceptance is tracked separately. |

| 20 | Library change inbox | Implemented manual bounded new-album inbox for Navidrome/Downtify; first scan establishes a baseline; identity/dedup tests pass. This is not a server-wide change journal. |

| 21 | Audio signal-path panel | Implemented engine signal path with explicit DAC-verification limitation; native build passed |

| 22 | Output-device profiles | Implemented manual named output profiles for EQ/ReplayGain/voice processing/headset policies and volume. Applying never raises current volume; validation tests and actual emulator profile save/apply checks passed. Automatic route binding is not implemented. |

| 23 | Expanded equalizer and EQ profiles | Implemented 10-band and up to 12 parametric filters, preamp, built-in tone presets and custom profiles; JS/native validation tests and bundled-MPV graphic/parametric filter application, reset and failure rollback acceptance passed. |

| 24 | ReplayGain controls | Implemented track/album ReplayGain, preamp and attenuation for untagged audio; disabled processing remains unchanged. |

| 25 | Reliable gapless playback | Implemented native MPV weak gapless mode with one prepared music entry and per-file authentication. Generated emulator mixed-account order, repeat-one/all, queue edits, outage/retry and timer acceptance pass. Format changes may reopen output; DAC/audible continuity remains a physical-device check. |

| 26 | Optional crossfade | Implemented optional 0–12-second native dual-decoder music overlap, complementary gains, pause/resume and cancellation. Generated emulator overlap, full-envelope timing, queue edits, single-tap seek, Stop and end-of-item timer acceptance pass. Spoken media/radio/timer sessions do not overlap. Physical listening quality remains to verify. |

| 27 | USB-exclusive output investigation | Research/hardware gate; no exclusive-output claim |

| 28 | Persistent playback sessions | Implemented separate native music and spoken queues with order, duplicate occurrences, explicit book/show/episode identities and whole-item positions. Spoken targets resolve lazily; revisiting opens a new server session. Generated book/episode queue, cross-file seek, force-stop/restart and previous/next acceptance pass on emulator. |

| 29 | Configurable headset controls | Implemented native next/previous/seek/disabled policy; model tests passed; physical headset test pending |

| 30 | Sleep timer upgrades | Implemented end-of-track/episode/whole-book timer; native build passed; playback check pending |

| 31 | Persistent download manager | Implemented: native service recovery, owned-file journal, explicit pause/cancel and original-file reuse. Actual emulator START_STICKY restart after killing only the test process, paused/cancelled preservation, independent original-byte verification, and force-stop/explicit-reopen acceptance pass. Native SAF storage/permission/rename failures pass. Force-stop requires explicit resume; no uninterrupted huge-transfer or reboot promise. Samsung prolonged acceptance remains. |

| 32 | Automatic offline rules | Implemented for saved music collections: opt-in Android WorkManager checks for pinned Navidrome/Downtify albums/playlists and Navidrome favorites, native revision checkpoints, unmetered/budget requirements, bounded four-collection passes and seven-minute scheduled transfer ownership. Cold-process generated-fixture download/reuse passes on the API 37 emulator. Android may defer work; force-stop requires reopening. Podcast inbox checks remain foreground-only. |

| 33 | Storage budgets | Implemented tracked-byte cache budget, no automatic deletion; native boundary tests passed |

| 34 | Download conditions | Implemented charging/unmetered transfer conditions and explanatory pauses; native tests passed; device interruption check pending |

| 35 | Predictive caching | Implemented opt-in upcoming saved-music cache (next 1/3/5), foreground/playing only, required unmetered policy and storage budget, cached/attempted/source/type filtering and 50-new-track app-session cap. Off/paused/no-upcoming-fetch and exact next-three original downloads pass in emulator. |

| 36 | Portable folder templates | Implemented flat Music and Artist / Album layouts for new downloads, preserving existing paths; SAF device checks pending. |

| 37 | Automatic M3U8 playlist export | Implemented relative exports with native ownership/hash checks, preserved order/repeats and explicit preview/confirmation for legacy exports. Changed files and unknown external playlists are protected. Native SAF linking/stale/removal acceptance and earlier Samsung Poweramp import pass; actual Android file-picker preview/link and non-destructive tracked-file maintenance acceptance passed. |

| 38 | Shared-file deduplication | Implemented SHA256 shared-file reuse in the same selected folder after downloading; matching bytes share storage and keep independent source identities. Transfer-byte deduplication is not claimed. |

| 39 | Offline metadata and artwork | Implemented metadata with cached audio, 128 MiB disposable thumbnail cache, and separate retained covers for explicit pins/cached media. Custom masters stay persistent. Retention retries are bounded/backed off; Isolated native offline regeneration, 128 MiB LRU eviction and retained/custom-master preservation passed. |

| 40 | Download integrity checks | Implemented manual file integrity rescans using byte count and SHA256, with non-destructive changed/unavailable results; Native original/reuse/hash verification, non-destructive corruption reporting and storage/truncated-response failure tests passed. |

| 41 | Offline progress reconciliation | Implemented explicit Audiobookshelf book/episode and Jellyfin original-video position review, source/credential/local/server revisions and stale-preview refusal. Generated emulator rejected/uncertain write preservation, confirmed use-phone and read-only use-server checks pass. No automatic overwrite, fictional playback-start session or listening-time replay; Jellyfin watched/resume rules still apply. |

| 42 | Smart resume | Implemented configurable spoken resume rewind after 10-second pause; book/podcast policy tests passed |

| 43 | Silence skipping | Implemented opt-in spoken-only gentle/balanced/strong processing with original timestamps. Native/model tests pass; Windows and bundled Android MPV fixtures skip the eight-second silent span while preserving source positions and original end time. Emulator episode completed in 5.4 seconds versus its 12-second source duration; setting restored Off. Physical-device listening quality remains to verify. |

| 44 | Voice-focused presets | Implemented optional per-content voice clarity for books and podcasts, alongside manual speech EQ preset; native type isolation tests pass. |

| 45 | Bookmark and note library | Implemented searchable bookmark/note library and text sharing; emulator screen checked; note export test pending |

| 46 | Podcast inbox rules | Implemented: show-scoped SQLite inbox, title/duration/unfinished filters, paged search/review, opt-in foreground checks and original-file cache. Emulator filtering, restart, outage/retry, cancellation and explicit cache acceptance pass. Podcast inbox background checks remain unimplemented; item 32 currently schedules saved-music collections. |

| 47 | Series-aware continuation | Implemented for Audiobookshelf books: explicit series membership, paged server sequence order, finished/current indicators and first-known unfinished continuation. Unknown progress is not guessed; playback remains explicit. Native model and read-only emulator acceptance pass. |

| 48 | Jellyfin playback controls | Expanded native chapters, speed, subtitle scale and audio delay. Generated emulator skip/scrub/options, retained-frame EOF/replay and PiP acceptance passed; real-content/route coverage remains device-dependent |

| 49 | Jellyfin video caching | Implemented: original-file Cache, dedicated native video playback, local resume and safe removal; external subtitles are not cached |

| 50 | Transcript search | Implemented user-imported offline VTT/SRT/plain transcripts for books/episodes, virtualized text search and guarded whole-item seek. Invalid imports cannot replace saved text. Provider transcript retrieval is not claimed. Emulator import/search, forward/reverse cross-file jumps, control lock and removal passed; 113 native and 61 JS tests pass. |

| 51 | Android Auto | Deferred by user |

| 52 | Home-screen widgets | Existing prototype; additional widget work excluded by latest user request |

| 53 | App shortcuts | Implemented dynamic Search/Library/Cache shortcuts; warm and cold Search destination verified; launcher interaction pending |

| 54 | Android sharing integration | Implemented: settings/notes/diagnostic sharing plus bounded Android text/plain reception, explicit-source public music link previews through Downtify 3.9, artist releases, native playback, server save and phone cache actions. Cold/warm share, text prefill, native playback, explicit server save and credential-URL rejection passed with a disposable fixture. Discover pasted-link acceptance also passed. |

| 55 | System media controls | Implemented native Android media session and notification/lock-screen artwork. Samsung real OS focus loss pauses playback and focus gain does not unexpectedly resume; explicit media play/pause passed. Emulator acknowledged Play/Pause/Next/Previous passed. The user confirmed DAC and screen-off checks. Physical Bluetooth-button coverage remains unverified. |

| 56 | Video picture-in-picture | Implemented native video PiP; generated-video native pinned-PiP runtime acceptance passed; ARM-translated emulator compositing is not a physical-device visual-quality measurement |

| 57 | Cross-device handoff | Excluded by user |

| 58 | Settings backup and migration | Implemented: password-encrypted native personal-data migration, read-only verification, fresh-install restore, destination Keystore re-encryption and rollback/restart recovery. Native isolated-process and Android file-picker acceptance pass. Media/cache catalogs, jobs and Android grants are excluded; see [BACKUP-MIGRATION.md](BACKUP-MIGRATION.md). Permanent-key backup/restore and signed-to-signed update passed on the isolated QA emulator. The real Samsung development installation was not uninstalled. |

| 59 | Update channels and release notes | Implemented stable/preview channels and release notes. Live GitHub no-newer-release check and seven native verifier/installer cases passed; the public asset is checked after publication. |

| 60 | Built-in diagnostics | Implemented redacted native diagnostic report and sharing. Signed v1.0.0 runtime report showed correct version/API/ABI and connection count without addresses, credentials or media titles; share action verified present. |



## Current batch acceptance



- EQ: apply preset, native filter accepts gain, save/reload/rename/delete custom preset, preserve ReplayGain and disable processing cleanly.

- Mixes: source identities survive duplicates, missing metadata fails filters, duration caps hold, cancellation cannot publish stale results, unreachable providers do not block others, play crosses providers through native resolution.

- App playlists: preserve order and repeated occurrences across providers; rename/reorder/remove; persist without server writes.

- USB-exclusive output, widgets, background jobs, video PiP and hardware controls require separate native/platform validation. Do not substitute nonfunctional UI for these features.



## Batch 1 verification (2026-11-07)



- Mobile TypeScript and lint passed; 30 JavaScript tests passed.

- Android native unit tests: 28 passed, including music queue identity and EQ preamp independence.

- Root desktop TypeScript, build, and 300 regression tests passed.

- Final ARM64 emulator release build succeeded and was installed on emulator-5554. This remains an internal RC2-numbered development build, not a published update.

- Emulator: Bass boost shows expected bands and -5 dB EQ preamp; custom profile survives restart; delete and processing reset work.

- Emulator: connected sources generated a 30-track mix; app playlist save and native player navigation succeeded.

- Hardware audio quality, USB-exclusive output and the full 58-feature expansion are not verified or complete. EQ playback needs audible/hardware validation in addition to UI and filter construction tests.



## Batch 2 implementation and verification (2026-11-07)



- Added collection search, central search filtering and conservative version grouping, source preference, bulk track actions, named collections and bookmark notes.

- Added native spoken-resume/headset policies, end-of-item timer, persisted music sessions, engine signal-path display, cache budgets and transfer conditions.

- Added Jellyfin chapters/speed/subtitle-scale/audio-delay controls and PiP, native home-screen widget, launcher shortcuts, portable appearance/EQ backups, update channels/notes and redacted diagnostics.

- Added source-scoped recommendation feedback and a bounded saved-library artist-radio queue. This is not yet continuous semantic radio.

- Mobile typecheck/lint passed; 36 JavaScript tests passed. 34 native regression tests and the ARM64 release build passed, including widget/radio changes. Startup-link routing received a follow-up fix; final rebuild passed and was installed in emulator-5554.

- Desktop typecheck/build and all 300 tests passed. Initial sandbox failures were filesystem/loopback restrictions; the unrestricted rerun passed.

- Emulator: collections create/add/restart persistence/delete verified, bookmark screen opened, cache controls changed and reset. Warm Search links and an explicit Android `am start -S` cold Search launch both pass after the startup-link fix. Temporary collection removed and budget restored to no limit.

- No publication. This remains an internal RC2 development build. Items marked partial or queued above remain incomplete; platform UI controls and native compilation do not establish DAC, PiP, widget or background-playback reliability.



## Performance pass (2026-11-07)



- Solid, blurred and frosted surfaces are normal choices. Liquid glass requires explicit acknowledgement of performance/battery cost; older unacknowledged liquid selections and imported liquid presets fall back to frosted. Detail Back buttons no longer instantiate the refraction renderer under other materials.

- Artwork selects physical-pixel buckets (96/192/384/768/1536), caches by size, and caps blurred backgrounds at 384. Provider thumbnail parameters are used for Navidrome, Audiobookshelf and Jellyfin. Native sampled decoding/resizing bounds returned artwork for all providers, including Downtify; Downtify may still transfer the original source image before resizing.

- Now Playing owns its fast progress clock in a separate timeline component, leaving artwork/queue/settings outside that render loop. Wave paths are precomputed. Dragging freezes the JS slider value and pending seeks reject stale native samples for a bounded acknowledgement window.

- Physical-device performance and touch reliability have not yet been measured for this pass. This does not complete the outstanding feature ledger or establish that every reported slowdown is resolved.



## Expansion and emulator pass (2026-11-07)



- Added the capability updates recorded above. The remaining queued and partial rows are still in scope and are not being described as complete.

- Playback now sends queue data across the native bridge only when that queue changes. Position updates reuse the existing queue in React. Android media controls consume the smaller state snapshot.

- Stream resolution now runs separately from playback commands. A generation check discards stale resolutions after switching/stopping; descriptors from discarded results are closed.

- Thumbnail decoding explicitly initializes the sampling factor to one. Runtime inspection caught and fixed a zero-sampling arithmetic error that had left placeholders visible. Artwork network/decoding work is bounded to four simultaneous requests instead of holding one global network lock.

- Emulator: real Navidrome audio loaded and advanced (6.9 to 10.1 seconds); Android MediaSession pause succeeded. Single taps at three seek positions moved native playback; queue opened afterwards and Next loaded the following track. Artwork rendering confirmed after the sampling fix.

- Mobile TypeScript/lint and 46 JS tests passed. Desktop TypeScript/build and all 300 regression tests passed. Native and final package results are recorded after the final rebuild.

- No claim of USB-exclusive/bit-perfect output, audible EQ quality, crossfade/gapless accuracy, or completed 58-feature parity. Physical-device performance testing remains necessary.



## Navigation and rendering follow-up (2026-11-07)



- Main Home/Explore/Library/Search routes now use retained, lazy tabs with frozen inactive screens. The existing floating navigation remains; switching tabs no longer replaces and reconstructs the whole page. Back handling is focus-scoped so hidden pages cannot intercept it.

- Horizontal shelves and central search results are virtualized. Artwork requests are limited to mounted card windows; existing density-sized native thumbnails remain in use.

- Android notification metadata is only rebuilt when track/duration changes, and the notification is only republished for track/playback-state changes. Main-thread playback updates are coalesced rather than accumulating in a backlog.

- Cache integrity scans reserve the maintenance flag only after parsing their snapshot and release it in finally, allowing queued transfers to resume.

- Parametric EQ emulator UI check: added a 1 kHz filter, changed gain to +4.5 dB, invoked headroom, then reset processing. This verifies UI/native settings handling, not audible DSP or DAC performance.

- Mobile typecheck/lint and 46 JS tests passed. 40 native unit tests passed. Emulator ARM64 release build succeeded; no GitHub release was published.

- Emulator navigation samples before retained tabs remained variable (16.67% and 23.44% janky frames). Shelf virtualization alone did not establish a smoothness improvement; physical-device measurements are still required.



### Library usability follow-up (2026-11-07)

- Quick access supports hiding, reordering, and resetting shortcuts. Server sections can collapse with persisted preference state.

- Music browse filters and offsets are remembered in a bounded session history. Cached music rows show an offline indicator; track actions also have a visible menu and metadata Details. Existing cache-first playback is retained.

- Unavailable servers have a Retry action in the side menu; retry currently rechecks all connections.

- Added no-server and all-shortcuts-hidden guidance. Cross-provider menu parity and persistent browse history across app restarts remain incomplete.



### Large-library follow-up

Implemented queue gestures/undo, shared provider action sheets, persisted browse options, cache management controls, connection recovery guidance, and bounded metadata retention. See `LIBRARY-PERFORMANCE-2026-11-07.md` for measurements, tests, and explicit remaining limits. Mobile 1.0 feature parity is not declared complete.



### Launch, artwork and landscape batch

Adaptive icons/splash, loading placeholders, first-run guide, native notification/media-session artwork, responsive player/library/detail/settings layouts and latest spoken-session resume are implemented. Samsung notification and active lock-screen artwork plus landscape controls were verified. 49 JS and 50 native tests pass. Broader release gates remain in RELEASE-GATES.md; additional widget work is excluded.



## Release completion pass (2026-11-07)



- Publication authorization is current, but stable release gates remain open; nothing was published by this pass.

- Extracted native provider resolution and bounded Subsonic requests from the React module. Foreground download recovery no longer requires a React module instance or a captured Activity.

- Initialization is once per native process, so recreating the React bridge does not pause an active transfer. Android-restarted services recover only formerly queued/downloading jobs. Pause, Cancel, Error and Complete remain authoritative.

- Android data-sync timeout pauses work and stops the foreground service; completed audio files are retained. Interrupted current files still restart from byte zero. Reboot/force-stop recovery and background automatic offline-rule scheduling remain incomplete.

- Added manually applied output profiles with validated audio/control settings and volume that cannot increase on application. Profiles are included in the portable settings backup. They do not claim USB exclusive output or hardware route detection.

- Newly exported playlists are tracked so cache removal can rebuild their relative file entries before deleting audio. Exports made before this change cannot be safely discovered and rewritten automatically.



- Follow-up checks: 52 JavaScript tests and 57 native tests passed; mobile typecheck/lint and desktop typecheck/build with 300 tests passed. A final native application-context rebuild is recorded separately.

- Fixed update checks to compare stable/prerelease versions, ignore development/emulator artifacts and avoid offering an already installed release. Existing package/version-code/signature checks before installation remain.

- Cache checkpoints now read a volatile native status instead of parsing persisted job JSON for every 64 KiB block. Tracked-byte totals are recalculated only when cached metadata changes. Runtime stress verification is still required.

- Feature count after this pass: 33 implemented (acceptance varies), 12 partial, 11 queued, 1 hardware investigation and 3 excluded/deferred. This is not feature-complete 1.0.



## Galaxy audiobook output follow-up



- Reproduced The Three-Body Problem failing with native MPV error -14 (Android audio-output initialization), while a bounded source probe returned valid HTTP 206 MP3 audio. This was not a secure-connection requirement.

- Added redacted native failure categories and an explicit bounded source check. Added one-time 48 kHz / 16-bit stereo compatibility retry only for output initialization failure, visibly reported in signal path. Original output negotiation remains the default per item; next-item reset was verified with FLAC on the Galaxy.

- Final phone verification and limits are in `AUDIOBOOK-PLAYBACK-INVESTIGATION-2026-11-07.md`. 52 JS and 63 native tests pass. This does not close the remaining expansion ledger or authorize a premature stable release.

- Jellyfin native controls now use distinct rounded button surfaces, pressed feedback, spacing, minimum 48 dp targets and separate narrow-screen rows. Saved mixes can be pinned into the existing Library shelf and opened directly from pins/collections. Native build and mobile typecheck/lint pass; full Jellyfin visual and saved-mix runtime acceptance remain pending.



## Custom media and continuation batch (2026-11-07)



- Music lyrics: native LRCLIB search, explicit match preview/download, UTF-8 LRC/text import, file export, existing paste editor and restore-automatic controls. Custom lyrics stay source/item scoped; books, podcast episodes and radio are rejected. Positive automatic matches also have a bounded native offline cache.

- Custom covers: native system image picker, bounded sampled import, private persistent copy, restore-server action and thumbnail refresh. Original server media/files are never edited. Custom master copies sit outside ordinary thumbnail eviction. Album cover import was observed rendering both the artwork and its blurred hero background in the emulator. Track/notification persistence and full picker acceptance remain to verify.

- Runtime testing found Android providers disagree on LRC MIME types. Import now selects files broadly and validates strict UTF-8, size and text content natively instead of relying on the extension's MIME classification. The revised picker requires a rebuilt runtime check.

- Smart queue continuation is disabled by default. Candidate retrieval runs natively outside the playback worker, uses saved music only and respects hidden tracks/artists. Clearing upcoming tracks suppresses continuation until a new session or explicit re-enable. Timed sleep, end-of-item sleep, repeat, spoken media and stale generation results prevent automatic append.

- Discovery inbox stores explicit saved references, not remote downloads. Balanced custom mixes now include bounded favorite/artist-history weighting; malformed persisted recipes are isolated instead of crashing the mix screen.

- Mobile typecheck/lint and 56 JavaScript tests pass. Native unit tests passed at 70 cases before the final picker rebuild. Desktop typecheck/build and all 300 tests pass. Final native/package and runtime results will be recorded after completion.

- This is not a completed 60-item release. Remaining ledger rows and release gates are still open; no GitHub publication was performed.



### Follow-up: conservative source fallback and lifecycle gate



- Initial source resolution can optionally try a matching saved music copy from up to three other connected sources. Unknown matching metadata is excluded. The queue and player retain the actual chosen source, and Now Playing labels the fallback. It does not substitute a live/remix version, rewrite playlists, or change download targets. This does not yet recover every failure after MPV has opened a stream.

- Jellyfin audio now retains its Album metadata for matching and display; video is not reinterpreted as music. The field was checked against [Jellyfin v10.11.11 BaseItemDto](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Model/Dto/BaseItemDto.cs).

- Runtime checks exposed a genuine cached-process Binder-traffic kill, documented in [the lifecycle investigation](BACKGROUND-LIFECYCLE-2026-11-07.md). Added background/focus polling suspension and native MediaSession transport throttling. 82 native regression tests pass, with 56 JS tests and mobile typecheck/lint passing. The rebuilt cached-picker check is still pending.



## Resumed implementation and acceptance — 2026-11-08



- Added spoken-only, opt-in silence skipping with gentle/balanced/strong presets. A generated 12-second podcast fixture with an eight-second silent span completed in 5.4 seconds on bundled Android MPV while retaining its original 12-second end position. The setting was restored Off. This validates timestamp handling, not listening quality on a DAC.

- Added imported VTT/SRT/plain-text transcript search for books and podcast episodes, separate from music lyrics. Emulator verification covers import, word filtering, a jump to 8 seconds in the second physical book file, a reverse jump to 1 second in the first file, control-lock enforcement and removal. Native validation rejects invalid UTF-8, excessive input, unsupported media and stale item identities.

- Exact 84-byte LRC import/export round-trip passed through Android's real document pickers. Automatic lyrics were restored after testing. Earlier custom-cover rendering and persistence evidence remains separate from notification/hardware acceptance.

- MediaSession throttling and paused progress/checkpoint suppression are covered by native tests. A 45-second paused picker hold retained the same process and unchanged transport state; Samsung long-background regression remains open.

- Mobile TypeScript/lint, 61 JavaScript tests and 113 native JUnit tests pass. Local release-preview builds and expanded desktop integration verification are recorded separately in release gates.

- Disposable spoken fixture connection and temporary transcript/export files were removed; original connections were preserved. No real audiobook progress was used for the cross-file transcript or silence tests.

- Current ledger: 39 implemented/expanded capabilities with varying acceptance, 10 partial, seven queued, one hardware investigation and three excluded/deferred items. Full 1.0 feature completion is not established.


### Android share target and public link resolution (2026-11-08)

- Added an Android `ACTION_SEND` text/plain target through the Expo config plugin and native module lifecycle. Receiving a share does not change playback or start a download. Public Spotify, YouTube Music, Deezer and SoundCloud HTTPS links are validated before forwarding to the chosen Downtify connection; credential-bearing, private-host and unsupported-scheme URLs are rejected. Plain titles can prefill central library search.
- Link previews use the version-tagged Downtify 3.9.0 `/api/url/resolve` contract and artist top-songs endpoint. Artist releases open their own previews; long results use a virtualized list. Playback, queue, explicit server save, phone cache and similar-music actions reuse the existing native integration. URI/file attachment import is not claimed; local files still use the native folder/document pickers.
- Emulator fixture acceptance passed: cold share without premature resolution, explicit source choice, native MPV playback, explicit download-batch submission only to the disposable backend, warm artist share, opening an artist release, text prefill and rejection of an authenticated URL without network resolution or app exit.
- Typecheck/lint, 61 JS tests and 116 native tests pass. The final pasted-link rebuild/runtime result and cleanup are recorded after completion. This closes one partial capability in the ledger: 40 implemented/expanded, nine partial, seven queued, one hardware investigation and three excluded/deferred. The complete supported scope is still unfinished.

- Final sharing preview: the rebuilt app also resolved a pasted link from Downtify Discover. The disposable connection was removed, its test server/reverse port stopped, and the real Daylight music session was reopened and left paused. Existing connection records were retained. Phone and emulator previews were built locally; final hardware and scope gates still apply.


### Semantic saved-library radio (2026-11-08)

- Checked Navidrome v0.60.3 (34c6f12) `getSimilarSongs2` and Jellyfin v10.11.11 `/Items/{id}/Similar` against version-tagged source. Jellyfin requires an Audio seed and filters responses to Audio items. Related Downtify discovery results supply artist names only; queue entries come from saved-library searches.
- Artist and track actions retain source identity, hide-track/hide-artist feedback, artist spacing and the chosen seed. Work is bounded to eight sources, four artist searches per source and 30 queue tracks. Unavailable sources time out independently; changing playback while a queue is being built aborts replacement. Same-artist fallback is labeled.
- Mobile typecheck/lint, 66 JS tests and 118 native JUnit tests pass. Emulator/native queue acceptance follows the rebuilt APK. Current ledger: 41 implemented/expanded with varying acceptance, eight partial, seven queued, one hardware gate and three excluded/deferred. This is not full 1.0 completion.

- Cold-start emulator acceptance reached native playback and a saved-library radio queue. It exposed an invalid initial native JSON snapshot (`{,"queue":[]}`); the bridge now publishes consistent initial defaults and immutable state/queue revisions. Three native regression tests bring the total to 121.
- A conservative radio duplicate check compares known title, artist, album and positive duration (within two seconds), preserving differently named remixes and different-duration versions. It uses a recording index rather than quadratic metadata comparisons. JS coverage is now 67 tests. The initial live check returned two copies of the same recording from different libraries; final duplicate-filtered acceptance must not reuse that earlier result as proof of unique selections.

- Final duplicate-filtered emulator check: a saved track opened a 30-track saved-library radio queue, loaded native playback and advanced to 16 seconds before being paused. The seven visible queue titles were distinct. This checked the labeled same-artist fallback; semantic related-artist and Jellyfin live-service acceptance remain separate. Both final APK variants built successfully and apksigner verification passed with matching development certificates.

- Final Home cleanup: explicit native `music` history entries normalize to playable tracks, with provider-aware book/show separation and unknown-kind rejection. Emulator direct-history playback passed. Final checks: 70 JS, 121 native and 300 desktop unit tests; mobile lint/typecheck, desktop build/typecheck and the full production Electron regression suite pass. Both local APK variants were rebuilt and signature-verified. Outstanding scope remains as counted above.


### Podcast inbox acceptance — 2026-11-08

- Added bounded native SQLite rules/inbox/seen identities, preserving separate account/show/episode identity and explicit podcast media type. Audiobookshelf v2.35.1 `/api/me` progress is read by episode and show; whole-book progress never completes an episode.
- Checks and cache are opt-in. Hourly checks run only while foregrounded, up to four shows per pass; Stop prevents late writes. Pending cache transfers obey existing folder/network/storage controls. Original files and relative playlist exports use the existing native Cache manager. No background scheduling or automatic server-progress writes are claimed.
- Source-derived Postman fixture acceptance passed: title/duration/unfinished filtering, cross-show identity, duplicate prevention, SQLite search/review, process restart, new episodes, 503 preservation/retry, delayed-request cancellation and explicit original caching. No listening-session/progress POST occurred. The generated cache copy, inbox entries/rule and connection were removed afterward.
- Mobile typecheck/lint, 70 JS tests and 131 native tests pass; emulator APK build succeeds. Current ledger: 42 implemented/expanded capabilities with varying acceptance, eight partial, six queued, one hardware investigation and three excluded/deferred. This remains an unreleased development build.


### Audiobook series acceptance — 2026-11-08

- Book detail exposes server-defined series. A dedicated paged list uses the v2.35.1 library-scoped series/progress API and exact Base64 series filter with sequence sorting; no full-library scan or name-based grouping.
- Wrong media/library/series identity, conflicting progress and repeated book IDs fail explicitly. Unknown progress is labeled and prevents skipping ahead to a later suggestion. Chapters remain whole-book markers on the separate book page.
- Emulator source-derived fixture confirmed series order, current/finished status, first unfinished recommendation and navigation to the correct next book, with read-only HTTP and no autoplay/progress mutation. Fixture connection removed afterward.
- Typecheck/lint, 70 JS tests and 137 native tests pass. Ledger after this capability: 43 implemented/expanded with varying acceptance, eight partial, five queued, one hardware gate and three excluded/deferred. Still not full 1.0 completion.


### Upcoming-track cache acceptance — 2026-11-08

- Predictive caching starts Off. Next 1/3/5 lookahead uses the current immutable native music queue, preserves source IDs, excludes the current/repeated/cached/attempted tracks and checks queue version/index again before enqueueing. Books, podcast episodes, radio, device files and unsaved Downtify discoveries are excluded.
- Requires an existing Cache folder, validated unmetered network, an enabled unmetered transfer condition and a positive storage budget. Existing queued/paused work takes priority; no paused transfer is silently resumed. Native Cache retains its charging/budget limits. A maximum 50 new tracks may be requested per native app session. No whole-library crawl, automatic deletion or background scheduling claim.
- Source-derived Postman/Android acceptance passed: Off streams only the current original, paused opt-in does not fetch ahead, playing next-three downloads exactly the next three originals, and completed copies appear in Cache.
- Acceptance exposed a stale Cache screen when native work began elsewhere. Native job-change events now coalesce updates on the focused foreground screen, without continuous idle polling. The already-open-screen update check passed. Generated copies/connection were removed and original Cache preferences restored afterward.
- Current checks: mobile TypeScript/lint, 70 JS tests and 142 native tests pass; Android emulator build succeeds. Ledger: 44 implemented/expanded with varying acceptance, eight partial, four queued, one hardware investigation and three excluded/deferred. The full supported scope and release gates remain unfinished.


### Original-video cache and idle checkpoint verification — 2026-11-08

- Jellyfin movie/episode originals can be cached into the selected shared folder under Videos and played through native MPV without server access. Cache-first playback preserves local resume; video identities never enter the music queue. Embedded audio/subtitle selection stays available; external subtitle downloads are outside this implementation. Offline video does not fabricate online sessions or upload listening-time deltas.
- A generated, finalized 30-second MP4 passed authenticated static transfer, offline playback to the end, five-second seeking and close/reopen resume. The fixture observed zero server requests/reports during offline playback. Cache integrity reported 7 verified, zero changed and zero unavailable. Generated cache media and fictional connection were removed afterwards; real sources/files retained.
- Transfer MIME validation now rejects HTML/JSON and streaming manifests as original-media files. Idle music checkpoints no longer rewrite/reparse the full queue every five seconds; unchanged paused sessions do no checkpoint writes. These changes reduce unnecessary work but do not establish that the Samsung background crash is fixed.
- TypeScript/lint, 70 JS tests and 159 native tests pass; emulator release-variant development build succeeds. Runtime video acceptance preceded the final MIME/message-only rebuild. Ledger: 45 implemented/expanded with varying acceptance, eight partial, three queued, one hardware investigation and three excluded/deferred. Not a finished/public 1.0 release.


### Explicit spoken progress review and reproduced stop crash — 2026-11-08

- Added native Audiobookshelf 2.35.1 progress preview/application for cached books and independently identified episodes. Whole-book positions are checked against the original physical-file timeline. A fresh expanded target read is required before interpreting missing progress as zero. Local/server/account revisions are rechecked before a user choice.
- Use-phone uploads only currentTime/duration and the existing continue-listening preference; no session creation, listening-time delta or forced timestamp. ABS derives completion from position, so the confirmation explains that effect. Use-server changes only the local resume point. Applying requires idle audio and a closed video player. The server has no atomic compare-and-set; a fresh preview reduces but cannot eliminate simultaneous cross-device changes.
- Generated book emulator acceptance passed: read-only preview, changed-server preview rejection with no PATCH, a rejected write preserving the checkpoint, an applied-but-error response preserving/refetching it, explicit confirmed position-only sync, use-server with no PATCH, and cached resume at the chosen position. Podcast acceptance also passed: the episode’s position-only PATCH used its show/episode route and left the book at its independently chosen server position.
- This test reproduced an existing PlaybackService NullPointerException when clearing the last track: Android platform-null JSONObject was dereferenced while updating media-session identity. Empty/JSON-null tracks now use a safe identity. Three regression tests cover initial, cleared and unchanged-stopped publications. The same native Stop sequence now leaves the emulator process alive. This is distinct from the earlier excessive-resource background exit.
- Mobile TypeScript/lint, 71 JS tests and 169 native tests pass. Emulator and Samsung-compatible development APKs build; the Samsung update retains existing data. the reported audiobook played/advanced on the physical Samsung and was paused; that attempt did not reproduce the original security error. Longer/background and original-failing-item acceptance remain explicit gates.
- Ledger: 45 implemented/expanded with varying acceptance, nine partial, two queued, one hardware investigation and three excluded/deferred. The complete supported scope remains unfinished; these are development-signed local previews, not a public release.


Samsung audiobook acceptance clarification (2026-11-08): the user confirmed the reported audiobook was the item that previously failed with the security message. It now starts and advances normally on the updated physical Samsung. This closes the specific failing-item playback retest; the historical generic message does not establish its original technical cause.


### Completed video transfer export — 2026-11-08

The final export step initially rejected ../Videos paths because PortablePlaylist allowed ../Music only. Original video bytes could be cached/playable while the job reported an export error. The shared renderer now permits only safe relative Music/Videos paths and rejects traversal, empty segments, backslashes and injected entries. Two new native regressions cover video export and bounds. Emulator acceptance now reports “Saved 1 original file and a portable playlist”; the exported ../Videos path resolves to the generated 428559-byte original. Both development APKs build, 171 native tests pass, and the Samsung update preserves data. This corrects job completion; it does not add external subtitle caching.


Physical portable-playlist acceptance (2026-11-08): an actual Media Center native export with four occurrences sharing one original WAV was copied to a disposable selected folder on the Samsung. Poweramp resolves four 30-second entries and a two-minute total without a Play action. Its existing six-second short-track filter was left unchanged; that filter excluded the initial five-second test fixture. Emulator removal also rewrote a tracked export to three entries while retaining the shared file. This closes the actual third-party import check for the generated fixture; legacy untracked exports remain outside automatic maintenance.


Final local test-build checkpoint (2026-11-08): 172 native tests and 71 JS tests pass; TypeScript/lint and both Android build variants pass. Offline-progress revisions also bind to the native credential identity, so replacing an API key invalidates an old preview even if the public connection name is unchanged. Credentials remain native; only an opaque revision is returned. Samsung and emulator have the refreshed development-signed preview, and checksums are beside both local APKs. Generated cache copies, fictional test connections and port forwarding were removed. Poweramp’s original media-only folder selection was restored and only the two generated test files/directories were deleted from the phone. No production signature, public tag or GitHub release was created. The supported feature ledger remains unfinished.


### Bounded scheduled music cache — 2026-11-08

- Foreground and closed-app collection checks now share the native rule engine; runtime checkpoints are kept separately from UI preferences so a later UI save cannot overwrite them. Definition changes invalidate their prior checkpoint; checks are limited to four due collections per pass and at most 500 unique saved tracks per collection.
- Background checks are explicitly off by default and require a selected folder, an unmetered-only transfer policy and positive storage budget. WorkManager applies unmetered, storage-not-low and optional charging constraints. The first check is scheduled after a minute, then roughly hourly; Android can delay it. A force-stopped app must be reopened.
- The first emulator attempt exposed Android rejecting the foreground-service path. The verified implementation instead uses bounded regular WorkManager work with the same original-file transfer code. Only jobs tagged to that worker are owned by it; manual jobs are neither claimed nor resumed. A seven-minute deadline, Android cancellation or disabling background checks pauses its unfinished transfers, which remain manually resumable in Cache. It does not promise uninterrupted huge background transfers or partial-file continuation.
- Native tests cover rule identity/type/limits, hourly/changed/clock-rollback checkpoints, saved-only ordered track selection and ownership-scoped cancellation. A due rule started from an absent app process, fetched the one removed generated original, reused three existing originals, completed its portable export and returned WorkManager SUCCESS. Earlier foreground acceptance downloaded all four originals. The scheduled test was triggered through Android JobScheduler after the native delay was due; it does not prove natural scheduling latency, reboot or Samsung overnight acceptance.
- Completed/cancelled transfer history is separate from active controls and paged at 20 entries. The background switch can always be turned off even after changing policy. Mobile TypeScript/lint, 71 JavaScript tests and 181 native tests pass; local emulator builds succeed. No public release or completed full-scope claim.


Scheduled-cache cleanup: the temporary rule, generated pin, four generated cache entries and fictional connection were removed through app controls; the original four connections and no-limit/unmetered-off policy were retained/restored. Disabling background checks removed its Android JobScheduler registration. The local simulation and ADB reverse were stopped. The physical Samsung remains on the earlier verified 172-native-test development build; no new overnight phone acceptance is inferred from emulator work.


### Spoken sessions, saved mix refresh and Jellyfin playlist editing — 2026-11-10

- Spoken queues persist source/type/show/episode identity, occurrence order and whole-item positions separately from music. No media URL or remote session is persisted. The generated two-file book sought into file two at 36.562 whole-book seconds; a force-stopped/restarted app restored the queue and position. Two identical episode occurrences stayed distinct. Pending episodes opened no sessions until selected; returning to the book opened a fresh session rather than reusing a stopped one. Stop checkpoints before clearing.
- Saved daily/weekly recipes refresh while the app is active, after a delay and with at most four due recipes per pass. Source scans are shared within a pass and bounded to 20,000 tracks per source. Native atomic snapshot storage is bounded, revision checked, strips authenticated URLs, and backs failures off for 15 minutes. Removing a recipe deletes its snapshot. Generated acceptance produced four tracks without Generate, retained them across cold restart, and retained the native snapshot after a confirmed HTTP 503. Earlier outage attempts were invalid because the fixture control ignored parsed request bodies; those attempts were superseded by the corrected test. Unit tests cover automatic cancellation/failure preservation; runtime closed-app scheduling is not claimed.
- Jellyfin music playlist editing follows the v10.11.11 controller/manager contract. Explicit CanEdit and fresh revisions are required; updates send Name/Ids without sharing fields. Rename-only edits retain existing occurrences; replacements reject duplicates because Jellyfin deduplicates them. Jellyfin internally replaces entries in separate steps, so concurrent remote edits cannot be made atomic by this client. Generated tests pass private creation, reorder, stale refusal without POST, read-only Save disabled, and one applied-but-error request followed by explicit reload. No blind retry or rollback is attempted. Downtify playlist mutation is still unfinished.
- Mobile TypeScript/lint, 76 JavaScript tests and 192 native unit tests pass. The updated development-signed emulator APK builds, installs in place and passes the generated runtime checks above. No user server playlist was mutated. The user requested emulator-only checks for now; physical headset/interruption and final distribution gates remain open. This is an unfinished preview, not public 1.0.


### Jellyfin cached-video progress review — 2026-11-10

- Cache now offers explicit position review for original movies and TV episodes. New video checkpoints bind media kind, original source ID and duration. Legacy/unbound checkpoints must be refreshed by playing that cached version; they are never guessed for upload. A fresh metadata read verifies the exact movie/episode, source and duration and obtains server position/completion before allowing a choice. Revisions also bind native credentials and local checkpoint contents.
- The Jellyfin 10.11.11 stopped-position endpoint derives the authenticated device session itself; the client sends ItemId, MediaSourceId, PositionTicks and Failed only. It sends no fictional playback-start session, PlaySessionId or historical listening-time delta. The confirmation explains server watched/resume rules and plugin activity. If Jellyfin normalizes a position under its resume policy, readback refusal retains the phone checkpoint for another explicit review. There is no cross-device atomic compare-and-set.
- Applying a choice requires an empty audio queue and closed video. Native Audiobookshelf/Jellyfin progress reports queued earlier must finish before a review can apply. The video lease is retained until its final report is queued, avoiding a close/review race. Tests cover queued, failed and rejected-executor release paths.
- Generated emulator acceptance passed cached native playback with an unavailable source, read-only review, changed-server refusal without a POST, rejected write preservation, applied-but-error preservation with one report and no retry, use-server without a write, and a fresh confirmed use-phone report. A resolved checkpoint is not offered for upload again. No real server progress was changed.
- TypeScript/lint and 76 JS tests pass; the final development release-variant APK builds with 199 passing native tests. This brings the ledger to 49 implemented/expanded capabilities with varying acceptance, five partial, two queued, one hardware investigation and three excluded/deferred. Supported scope and final public release are still unfinished.

Final emulator cleanup (2026-11-10): generated mix recipe/snapshot, three initial QA connections, generated video cache copy and final video QA connection were removed through app controls. All four original connections and pre-existing cached music/book/episode records were retained. Local simulations and ADB test forwarding were stopped. The latest emulator preview is installed and running; its SHA256 is d8c4c490fd15e54898b613155bedd88402e3665efaa26f2596e9e9b77f9e6c1a, with the existing development certificate. The Samsung-compatible artifact was not rebuilt or installed in this emulator-only checkpoint.

### Music transitions — 2026-11-10

- Gapless uses MPV weak mode, preserving format changes instead of forcing the first track’s sample rate. One next music entry resolves natively, with structured per-file HTTP options. Playlist prefetch is disabled across account/header changes because MPV opens prefetched input with the current demuxer options. Generated cross-account playback used the correct account on every stream and retained four-track order; repeat-one and repeat-all identities passed. These checks establish engine/transport behavior, not audible USB continuity.
- Crossfade is Off by default and takes priority over gapless when enabled. Two native MPV outputs use complementary linear gains, never a correlated peak boost from equal-power mixing. A monotonic presentation envelope continues through outgoing decoder EOF and freezes while paused. The faster fade timer runs only during active overlap. Two-second acceptance measured approximately 2.07 seconds with emulator scheduling, and subsequent queue entries began at the incoming track’s already-advanced position.
- Queue edits discard prepared state; generated pending metadata stays named without accepting renderer URLs/headers. Moving B Two before A Two played B Two next and never the stale prepared source. One tap sought to 4.875 seconds of an eight-second original. Stop during overlap produced no later handoff and the process stayed alive. End-of-track sleep stopped without overlap or queue advance. A failed next resolve displayed a connection error, did not claim Playing, and recovered at the correct item after explicit retry.
- Books, podcasts, radio, multipart targets, resumed next items and any sleep-timer session are excluded. Repeating the exact already-open file descriptor uses ordinary reload to prevent concurrent shared-offset readers. Format-changing originals, local/cached codec combinations, output-route restrictions and physical listening quality still need acceptance; slow sources can buffer.
- Mobile TypeScript/lint and 76 JS tests pass. The safeguard release-variant build has 211 native tests, zero failures/errors. Root desktop typecheck, all 300 tests and production build pass; the first sandbox attempt blocked local sockets and Windows junction operations, so the successful run used the ordinary host environment.
- Scope now has 51 implemented/expanded capabilities with varying acceptance, five partial, one hardware investigation and three excluded/deferred. No permanent-key build, phone installation, GitHub publication or stable release is claimed.

### Downtify server playlist editing — 2026-11-10

- Verified the exact 3.9.0 source commit `63ca91ea4de1207c4ffb0427b1c45dc3a2a23eee`, including playlist routes, the viewer permission lens and manual-file editor. Native credentials, stored file paths and file-ID conversion stay outside React. The editor exposes only saved tracks; it cannot turn a discovery result into a permanent download by adding it.
- Owned/manual and explicitly granted editor membership is checked again before writing. Only owners may rename. Imported playlists and liked songs stay read-only here. A revision binds native account credentials, ordered files, ownership and sharing flags. Stale drafts send no write. The API has no atomic compare-and-set: concurrent remote edits remain possible, and readback refuses unexpected state rather than overwriting or retrying.
- Each Save performs one operation: create an empty playlist, append/remove membership, or rename. Combining a rename with membership changes is refused before mutation. Arbitrary reordering and repeated entries are refused because the server add/remove endpoint cannot preserve those semantics; app playlists continue to support them. No source-sharing, cover or monitor settings are sent.
- Generated emulator acceptance passed empty creation, ordered append with one request, owner rename preserving tracks, stale-draft refusal with zero writes, one applied-but-503 membership request followed by a refused stale retry, and revoked edit permission with Save disabled after reload. No real server playlist was changed. The generated connection and ADB forwarding were removed afterward.
- Mobile TypeScript/lint, 76 JS tests and 218 native tests passed for the acceptance build. A final fail-closed malformed-permission validation build is tracked separately. This brings the ledger to 52 implemented/expanded capabilities with varying acceptance, four partial, one hardware investigation and three excluded/deferred. Full migration, download/file lifecycle acceptance, legacy export ownership and final system-control/hardware/distribution checks still remain.

Final transition/editor checkpoint: 222 native tests, 76 JS tests, mobile typecheck/lint, root typecheck/300 tests/build pass. The final development-signed emulator preview has SHA256 `9b5bfef3557634d18dd5638ef9b941fc874ffb0bfd6e5c4a4b4d78f8ae33e698`. Removing a current saved-music source now hides its invalid resume shortcut; removing other queue sources preserves the surviving occurrence order, index and position. A configured but unreachable source is retained. Four added native tests cover these cases. The latest APK is installed without clearing user data; final runtime verification is recorded in the ignored checkpoint JSON. No phone or public-release acceptance is inferred.

## Final candidate verification — November 11

- Latest source passes 248 native tests and fail-closed native Android lint (zero errors). Mobile typecheck, lint and 76 JavaScript tests pass; desktop typecheck, 300 tests and production build pass.
- Native generated-media regression verifies gapless advancement, crossfade pause/resume with the full active envelope, Stop cancellation and duplicate-free saved-music continuation.
- A generated 10,000-track metadata catalog advertising 209,715,200,000 bytes passed bounded browsing and complete sorting. This is not a downloaded 200 GB library or a Samsung frame-rate measurement.
- A 345,600,044-byte original completed a roughly 345-second native background transfer with independently matched hashes and paused/cancelled job preservation. No overnight, reboot or uninterrupted huge-transfer guarantee follows from this check.
- The stale partial system-control entry is superseded by the actual Samsung audio-focus results, emulator transport acknowledgements and the user-confirmed DAC/screen-off acceptance. The ledger now has 56 implemented/expanded capabilities with scoped acceptance, one USB-exclusive research item and three excluded/deferred items. Some optional UI/physical-route combinations remain unverified; implemented does not mean every device combination has been tested.
