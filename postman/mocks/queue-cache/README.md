# Saved music queue cache fixture

Local only, with generated WAV audio and fictional token-auth credentials. The Subsonic album, track and stream contract follows the checked Navidrome 0.60.3 sources in the ignored API-source checkout. No real server, account or media is used. Unmodeled operations return 501.

Run the simulation on port 18547 and use its `music` route through an emulator-only ADB reverse. `/__state` contains bounded operation, fictional item ID and Range-header observations, never tokens. Assert no next-track stream requests while predictive caching is off or paused, then explicit opt-in plus unmetered/budget policy caches at most the next requested music tracks. Remove only this fixture's cache entries/connection and restore prior settings afterward.

This proves local Android/native behavior against a stand-in, not physical-device background reliability, third-party playlist import or live-server compatibility. Do not deploy or publish run history.

Set MEDIA_CENTER_QUEUE_FIXTURE_SECONDS to an integer from 1 through 120 for shorter interoperability fixtures. The default remains 120 seconds for the original predictive-cache scenarios. All files/identities are generated QA data.

The same fixture supports bounded `search3` scans for saved-mix tests. POST `/__control` with `{ "fail": true }` makes authenticated API requests return HTTP 503; false restores them. `/__state` reports the failure flag so tests must confirm it before claiming outage acceptance. Controls support both raw Node request streams and Postman parsed request bodies. Verify a saved recipe generates without manual action, survives a cold app restart, and keeps its prior native snapshot after a confirmed failing refresh.

For native service interruption checks, `MEDIA_CENTER_QUEUE_FIXTURE_CHUNK_MS=250` throttles generated stream responses in 64 KiB chunks. The default is 0 (unthrottled). This is a local test timing fault, not an assumption about Navidrome throughput. Disconnecting a client cancels its timer. The original bytes/Content-Length remain unchanged.

Prolonged emulator checks may explicitly set `MEDIA_CENTER_QUEUE_FIXTURE_LARGE=1` and `MEDIA_CENTER_QUEUE_FIXTURE_SECONDS=3600` for a 345,600,044-byte generated WAV. The server generates bounded 64 KiB blocks, honors backpressure and never allocates the whole original. Use a throttle to exercise a sustained transfer. This is not a 200 GB cache or a Samsung result.

`MEDIA_CENTER_QUEUE_FIXTURE_TRACKS=10000` exposes a 10,000-track generated catalog with 20 MiB declared track sizes (about 195 GiB of advertised library metadata). Only requested generated originals are served. This exercises metadata/list rendering, not actual storage of that entire library. The default remains four tracks.
