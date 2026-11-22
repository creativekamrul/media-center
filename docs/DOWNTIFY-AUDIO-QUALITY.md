# Downtify audio quality in Media Center

Verified against Media Center desktop source and Downtify tag 3.13.0 on 2026-11-23.

## Saved tracks

The desktop provider requests `GET /api/v1/tracks/{id}/stream` without a `format` or `bitrate` parameter. Downtify documents this as the original-file route; older file-backed entries use `/media/<relative file>`. Media Center passes the response to native MPV without an additional encoding step. A genuine saved FLAC can remain lossless on this path, but the file extension alone does not prove the original source was lossless.

## Unsaved discovery

After matching the title, artist and approximate duration to a playable video, the desktop provider requests `/api/stream/file`. In Downtify 3.13.0, both `_ydl_options` and `StreamCache._fetch` use `bestaudio[ext=m4a]/bestaudio/best`. This prioritises the best available M4A before other formats. It is not a generic highest-bitrate-across-codecs selection and does not promise lossless or hi-res audio. The server downloads/cache-serves the selected audio for full playback; it is not the separate thirty-second preview endpoint.

No fixed bitrate can be promised for every song. Source availability, selected video, server version and upstream format access matter. Media Center does not override the server format selector. Changing it would be a Downtify-server change, not a client EQ or quality setting.

## Output

MPV decodes the stream. Optional EQ, ReplayGain, volume, crossfade, resampling and OS/device configuration can alter the output. Original-file transport is not by itself a hardware bit-perfect guarantee. A DAC or file-container label is not proof of source fidelity.

## References

- [Downtify 3.13 stream selector](https://github.com/henriquesebastiao/downtify/blob/3.13.0/downtify/stream.py)
- [Original versus transcoded mobile stream contract](https://github.com/henriquesebastiao/downtify/blob/3.13.0/docs/mobile-client-contract.md)
- [Downtify full-track cache playback](https://downtify.henriquesebastiao.com/features/player/)
- Client implementation: `src/main/providers/downtify.ts`, `streamPath`.

Actual codec, sample rate and bitrate require inspecting the particular playing stream. No listening/hardware quality comparison is claimed here.
