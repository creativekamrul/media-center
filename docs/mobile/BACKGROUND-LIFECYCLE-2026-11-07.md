# Cached-process Binder traffic investigation



## Observed failure



During emulator custom-lyrics picker checks, Android killed Media Center while it was behind the native file picker. The UI returned to Home and the in-memory picker request could no longer complete. Android ApplicationExitInfo recorded reason 9 (EXCESSIVE RESOURCE USAGE), subreason 7 (EXCESSIVE CPU USAGE), with description `excessive binder traffic during cached`, at 2026-11-07 08:39:16. RSS was reported as 448 MB; this is not evidence that an out-of-memory kill caused the failure.



## Changes



- PlaybackService previously called MediaSession.setPlaybackState on every 200 ms publication, including an unchanged paused state. The native transport policy now publishes track/play/pause/speed changes, seeks and clock drift immediately; an advancing clock has a five-second heartbeat. An unchanged paused state does not generate repeat transport Binder calls. Android clients can extrapolate the playing clock using the supplied speed and update time.

- React's 250 ms playback polling stops when the app is backgrounded and refreshes immediately on return. Native playback remains independent of React.

- The fast Now Playing display clock only runs while its screen is focused and the app is active.

- Cache-screen polling stops while backgrounded. Foreground cache rules do not continue starting rules after the app is hidden; already-running native transfers are not stopped by this change.

- Native video stops its UI timer while stopped outside PiP, and restores it on return. PiP keeps its existing playback behavior.



Lifecycle behavior follows [React Native 0.88 AppState](https://reactnative.dev/docs/appstate); Android temporary system activities also count as background. Project version is Expo SDK 58.



## Verification



- Native transport tests cover thousands of identical paused samples, five-second playing heartbeats, seeks while paused/playing, pause/resume, speed changes, book/podcast identities, drift and invalid values.

- 82 native tests and 56 JavaScript tests pass. Mobile typecheck and lint pass.

- The rebuilt cached-picker hold/return test remains to be recorded. Do not describe long background reliability, battery use or all performance issues as verified based on these unit tests.



## Progress and error-clock follow-up



- Audiobookshelf and Jellyfin audio now send progress on playback state changes, explicit seeks and active-playback heartbeats, rather than repeatedly resubmitting an unchanged paused position.

- Audiobookshelf closes an unchanged paused session with an empty sync body. In the pinned 2.35.1 [controller](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/controllers/SessionController.js) and [session manager](https://github.com/advplyr/audiobookshelf/blob/v2.35.1/server/managers/PlaybackSessionManager.js), that closes the session without updating user progress again. Uncertain listening deltas remain non-retriable.

- Jellyfin retains its required position on stop reports. Omitting it is not a safe conflict strategy: Jellyfin 10.11.11 may interpret a positionless stop as played to completion. Full cross-device progress conflict handling remains open.

- Unchanged local checkpoints no longer receive a fresh timestamp simply because a paused timer ticked. Offline and online book/episode identities remain separate.

- MPV error handling retains the last valid file-relative clock instead of substituting zero when the stream unloads. Output compatibility recovery uses that checkpoint. Book checkpoints still use explicit file-relative to whole-book conversion; episodes reset their own clock.

- The expanded native suite passes 90 tests, including paused progress suppression, pause/resume/seek updates, timestamp stability and multi-file book/podcast error-clock cases. Final rebuilt runtime acceptance remains separate.



## Follow-up verification — 2026-11-08



- The rebuilt app survived a 45-second native file-picker hold with the same process ID. Its paused MediaSession state, including the update timestamp, remained unchanged. Cancelling the picker returned to the player. This repeats the process-survival result observed on November 7 and directly covers the cached Binder-traffic failure scenario.

- Imported the labeled UTF-8 lyrics fixture through the real Android picker, exported `Daylight.lrc` through the native save dialog, and pulled the output using ADB's file-transfer protocol. All 84 bytes exactly matched the LF-normalized input. Restored automatic lyrics for the tested track and paused playback afterward.

- Full accessibility snapshots are required for the emulator's current native navigation stack; compressed snapshots were returning the previous screen while a screenshot showed the new one. Test automation now uses full snapshots and normal-duration presses. This automation issue is separate from the recorded app process kill.

- These results do not establish Samsung long-background reliability, physical headset behavior or a fix for every performance issue. The Samsung crash regression remains a release gate.



- An additional two-minute emulator background check retained the same paused process at every 20-second sample, then returned to the activity. This is bounded regression evidence, not a claim of long screen-off or Samsung acceptance.

