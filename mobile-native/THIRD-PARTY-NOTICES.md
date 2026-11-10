# Third-party components

Media Center is GPL-3.0-only. Dependency licenses remain with their authors.

- Expo 58, React Native 0.88 and React 19.3: MIT; license texts are in `licenses/`. Exact JavaScript dependency versions are in `package-lock.json`.
- DM Sans: Copyright 2014 The DM Sans Project Authors, SIL Open Font License 1.1; full license in `licenses/DM-Sans-OFL.txt`.
- Sora: Copyright 2019 The Sora Project Authors, SIL Open Font License 1.1; full license in `licenses/Sora-OFL.txt`.
- Native MPV/FFmpeg libraries are extracted without modification from the pinned mpv-android ARM64 release `2026-09-17` by `scripts/prepare-mpv.ps1`. That script records the exact upstream APK URL and SHA256. The source project is https://github.com/mpv-android/mpv-android and its embedded `buildscripts/` tree specifies the native build dependencies.

## Distribution work still required

This file records provenance; it is not the complete corresponding-source bundle for the native binaries. Before publishing an APK, retain the exact upstream tag/dependency/submodule commits, build configuration and corresponding native sources, include their applicable license texts, and make that source material available alongside the public release. Finish the transitive dependency notice inventory as well. A link to the latest MPV or FFmpeg source does not identify the exact bundled source.

## Source collection checkpoint

`python mobile-native/scripts/package-native-sources.py` collects the pinned release sources, exact Git revisions, upstream build scripts/patches and nested submodules. Each verbatim archive has a byte count, URL and SHA256 in its manifest. Its output stays in ignored release/mobile/. On November 10, 2026, 22 archives passed an independent hash/readability check. Lua's license is in doc/readme.html; libunibreak's notice is retained in its source headers. The generated collection does not replace the complete application/JNI source release or finish the transitive/C++ runtime notice inventory.


## Final local collections — November 11, 2026

The local distribution directory now includes the complete current app/JNI/config-plugin source collection, the 22-archive pinned native-source collection and a third-party notice archive. The latter retains 513 npm component records, 161 resolved release Maven components, original available notices/POM metadata, font notices and exact LLVM/libc++/libc++abi notices; 712 entries in total. Applicable standard license terms accompany the original notices. All archive member CRCs and SHA256 sidecars were verified. Public releases must attach these collections alongside the APK; their local existence does not make them publicly available.

Reproduce source collections with `scripts/package-app-sources.py` and `scripts/package-native-sources.py`. `scripts/assemble-third-party-notices.py` consumes the read-only dependency audit inputs described in its header. Exact native URLs, revisions and byte hashes are recorded in `native-source-lock.json`.
