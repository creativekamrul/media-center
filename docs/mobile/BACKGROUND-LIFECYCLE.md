# Android background lifecycle


## Stop-path crash regression — 2026-11-08

An emulator acceptance test reproduced a PlaybackService main-thread NullPointerException after the final track was cleared. The media-session transport/metadata identity called JSONObject.toString on Android’s platform-null result. MediaTransportIdentity now handles missing/JSON-null tracks. Three native regression tests cover cold state, playing-to-empty and unchanged empty-state throttling. The same stop sequence preserves the emulator PID after the fix.

Physical Samsung SM-S918B was updated in place with the development-signed build. the reported audiobook started and advanced normally, then paused. A background observation retained the same PID and exactly the same paused media-session timestamp/position for more than three minutes. This is a bounded observation, not proof of indefinite survival or a reproduction/fix of every previous excessive-resource exit. Final duration and phone Stop acceptance are recorded in ignored runtime evidence after completion.


Physical Samsung stability checkpoint (2026-11-08): the loaded, paused audiobook service retained the same PID and unchanged paused media-session timestamp/position for 498 seconds, including a two-minute screen-off observation in Samsung Dozing / DOZE_SUSPEND. Native media Stop also retained the process without the reproduced null-track exception. PSS settled from approximately 421 MiB to 348 MiB and Binder object counts decreased. This is bounded acceptance, not an all-day battery/background or USB-exclusive audio claim.


Scheduled music-cache checkpoint (2026-11-08): opt-in native WorkManager rules passed a cold-process API 37 emulator check using generated music: one absent original downloaded, three originals reused, export completed, worker SUCCESS. A restricted background foreground-service start was discovered and replaced with bounded regular work using ownership-tagged transfers. Seven-minute/cancellation pauses never claim manual jobs. Android policy/quotas and force-stop still apply; no overnight Samsung or reboot claim. Native tests total 181; mobile JS tests total 71. The public-release gate remains open for other unfinished supported scope.
