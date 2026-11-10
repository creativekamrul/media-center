# Local Audiobookshelf inbox fixture

Local only. Do not deploy or use real credentials. `fixture-token` and every item are fictional; the WAV is generated silence. The contract was checked against Audiobookshelf v2.35.1 (`aacdcc47ec0b6fa778b84627c79deb7ee0cecd70`), particularly `LibraryItemController.findOne`, `MeController.getCurrentUser`, `MediaProgress.getOldMediaProgress`, `PodcastEpisode.toOldJSON` and the original-session route.

Run the one-port simulation at port 18546. Android's client has an explicit source URL rather than an HTTP proxy option, so use `http://127.0.0.1:18546/abs` through an emulator-only ADB reverse. Enable HTTP only for this disposable account. The handler supports direct Node execution for local debugging and namespaced `pm.state` when available.

`GET /__state`, `POST /__reset`, and `POST /__control` (`advance`, `fail`, `delay`) control only this fixture. Assert that inbox scans perform reads, keep episode/show identities separate, exclude finished/trailer/long/unavailable items, and do not write listening progress or fetch audio before explicit playback/cache intent. State can add new episodes, fail item detail, or delay it to exercise cancellation and retry. Cache serving supports byte ranges. Unknown modeled item IDs return 404; unmodeled operations return 501.

Postman CLI 1.73.0 has no `status` command on this device. No cloud owner lookup, push, deployment, or run history publication is performed. This is a source-derived stand-in, not proof of Samsung background behavior or live-server persistence.

The fixture also supplies a three-book series with explicit membership, decimal-capable sequence strings and library-scoped completion status. Its filtered items route rejects incorrect series filters, missing sequence sorting or minified metadata. Read-only emulator series navigation passed on 2026-11-08.
