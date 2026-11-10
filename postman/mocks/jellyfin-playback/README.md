# Local Jellyfin playback fixture

This is disposable test content, separate from user libraries. No real credentials are used. It models only the routes in `default.js`; unmodeled routes fail explicitly. Do not deploy it: local file reads are required.

Generate a five-second test pattern into the ignored `artifacts/mobile-native-tests/video-fixture.mp4` with an FFmpeg-compatible encoder. For the project's existing Windows MPV QA binary, run the following arguments and wait for that process to exit:

```text
artifacts/mpv-qa/mpv.exe --no-config --ovc=mpeg4 --of=mp4 --o=artifacts/mobile-native-tests/video-fixture.mp4 --frames=150 av://lavfi:testsrc=size=640x360:rate=30
```

From the repository root:

```text
postman simulation run postman/simulations/jellyfin-playback.sim.yaml --port 18543 --no-history
adb -s emulator-5554 reverse tcp:18543 tcp:18543
```

Add the explicitly named disposable `MC-Jellyfin-Fixture` connection at `http://127.0.0.1:18543/jellyfin`, with `fixture-user` / `fixture-secret` and explicit local HTTP consent. Remove only that fixture connection after testing.

`POST /jellyfin/__reset` with `{ "failStream": true }` makes streams return 503. Reset with `{}` to restore them. `GET /jellyfin/__events` shows recorded playback payloads. Nothing is written to a real Jellyfin server. A passing fixture test demonstrates client behavior under this model, not full Jellyfin compatibility.
