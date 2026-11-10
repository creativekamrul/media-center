# Jellyfin offline progress fixture

Generated video, fictional accounts and GUIDs only. Extends the existing original-video fixture with stateful stopped-position reporting. Checked against Jellyfin v10.11.11 PlaystateController and SessionManager: the controller derives the current authenticated device session, accepts a stopped report without PlaySessionId, and applies server watched/resume policy. No playback-start session or listening-time delta is sent. Server plugins can observe the stop event; this is disclosed in the confirmation. Cross-device atomic compare-and-set is unavailable.

Control modes before/after/offline inject a rejected write, applied-but-error write, and total source outage. Explicit position/finished changes invalidate previews. Test metadata and cached-source identity before writing; stale/failed/uncertain writes preserve the checkpoint, no blind retry; use-server performs no POST. Stop the simulation, remove the generated cache and connection, and restore prior Cache policy. Never publish request history or generated media.

Sources: https://github.com/jellyfin/jellyfin/blob/v10.11.11/Jellyfin.Api/Controllers/PlaystateController.cs and https://github.com/jellyfin/jellyfin/blob/v10.11.11/Emby.Server.Implementations/Session/SessionManager.cs
