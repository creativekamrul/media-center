# Galaxy audiobook playback investigation

## Confirmed observation

On the Galaxy S23 Ultra running the internal 1.0.0-rc.2 / versionCode 8 build, The Three-Body Problem reaches Now Playing but fails before an active decoder is reported. The visible message is “Unable to play this file. Check the source and connection.” This is not an explicit secure-connection requirement. The source, codec and output properties are unavailable after the failure.

The reported audiobook and a second book could be opened on the emulator. This does not establish that the same failing file plays on either device, nor that the server or phone is the cause.

## Diagnostic changes

- Native MPV end-file errors retain a numeric code and a predefined classification from warning/error events. Raw engine log text is never logged, persisted or sent across the UI bridge because it can contain authenticated URLs.
- Public error text distinguishes authorization, missing files, TLS, timeouts, network access, unrecognized responses, missing decoders and Android output failure.
- An explicit Audio signal path action performs a bounded read-only first-byte HTTP Range check on the currently attempted original source. It reports HTTP status, media type, range support and a container label, never a URL, token or response body. Local-file sources are identified separately.
- No TLS bypass, server-transcoding fallback or media-file modification was added.

Root cause and final verification are pending the phone reproduction with these diagnostics.

## Phone diagnosis

The updated diagnostic build reproduced the failure. A bounded Java-network check of the currently attempted part returned HTTP 206, audio/mpeg, supported byte ranges, and ID3-tagged audio. The item contains 35 physical audio files. The connection is HTTP, so TLS verification cannot explain this attempt.

The redacted native error was `unknown|-14`. The bundled MPV client header defines -14 as `MPV_ERROR_AO_INIT_FAILED`: Android audio output initialization failed. This is an output setup failure, not an authentication or secure-connection requirement. The previous error text incorrectly grouped it with file/connection failures.

A targeted fix maps the native code directly and retries only this exact output error, once per queue item, with 48 kHz / 16-bit stereo compatibility output. Original output negotiation remains the first attempt for every new item. Compatibility mode is visible in the signal-path panel; it is not described as bit-perfect or source-rate output. No null/silent output fallback is enabled. Phone validation of the retry remains pending.

## Verified phone result

- Final local build installed over the existing Galaxy preview without clearing app data. Mobile typecheck/lint and 52 JavaScript tests passed; 63 native unit tests passed; Android phone APK build passed.
- The Three-Body Problem started and the Android MediaSession reported PLAYING with an advancing position beyond the former failure. Signal path: MP3, float-planar decode, 22050 Hz source; 48000 Hz stereo AudioTrack output. The compatibility indicator was visible. This verifies the attempted part, not all 35 files or audible DAC fidelity.
- The initial recovery test caught a default-option reset bug before retry. MPV prints its unspecified audio-format as `no`, which is not a valid format parser value. Reset now recreates the native engine only when leaving compatibility mode and preserves volume/speed; it does not parse the printed unspecified format back into an option. An isolated silent desktop MPV check confirmed valid compatibility-option setters.
- A subsequent Navidrome FLAC track played successfully. Signal path showed FLAC / s32, 48000 Hz source and 48000 Hz stereo AudioTrack output; the compatibility indicator was absent. This confirms normal negotiation resumes on the next item.
- Playback was paused after verification. No claim of bit-perfect output is made. The original file is fetched directly; conversion in compatibility mode happens locally after decode.
