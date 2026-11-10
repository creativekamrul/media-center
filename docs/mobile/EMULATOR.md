# Android emulator workflow

Initial development targets `Medium_Phone_API_37.0` (`emulator-5554`). Do not run unqualified ADB commands while the physical phone is attached. Set `ANDROID_SERIAL=emulator-5554` for Python device tests, or use `adb -s emulator-5554` explicitly.

Build with `mobile-native/scripts/build-preview.ps1 -Emulator`. This retains the original MPV engine and packages extracted ARM64 libraries for this virtual device's ARM translation. The regular phone APK remains a separate artifact. The emulator package is `release/mobile/Media-Center-Mobile-0.2.0-emulator.apk`.

The emulator has independent app storage and connections. Do not copy secrets or user profiles from the phone. Use explicitly named fictional fixture connections for automated checks. Temporary ADB reverse mappings must be removed after tests.

Verified on 2026-11-06: app startup; original silent WAV playback through MPV; fixed-height Now Playing without tabs or page scrolling; queue sheet; Android Back dismissing the sheet; five-second seeking from playback options. The fixture screen is saved under ignored `artifacts/mobile-device/mobile-player-fixed.png`.

`tests/emulator-player.py` requires the clearly named `MC-Native-Fixture` test account with the local server fixture used by `device-playback.py`. It must never select an arbitrary user connection or modify its library.

USB DAC, Bluetooth, physical output quality and Samsung background behavior remain real-device acceptance checks, deferred at the user's request. Emulator success does not prove those properties.
