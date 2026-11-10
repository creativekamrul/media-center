# Native playback dependency — local development

The Android preview uses libmpv and FFmpeg from the official mpv-android
2026-09-17 arm64 release. `mobile-native/scripts/prepare-mpv.ps1` downloads
that exact release, verifies SHA-256, and extracts only the native engine
libraries. Media Center supplies its own JNI bridge; upstream `libplayer.so`
is not used. The matching upstream C++ shared runtime is packaged once for
both MPV and React Native. The older React Native runtime lacks a floating-point
conversion symbol required by this MPV build. `with-mpv-runtime.cjs` pins the
merged runtime; on-device startup, playback and background transport tests
verify compatibility. The build checks the packaged runtime's SHA-256 against
the verified dependency archive.

- Binary: https://github.com/mpv-android/mpv-android/releases/tag/2026-09-17
- SHA-256: `0b0e0a534dd6b8d2b117f06952e0600064ad97702e48bff02543e3e32107803d`
- mpv: `0b7ed670f7c353dd3dd4f8ae0fc788a181a15aa6`
- mpv-android: `fdf74f6830c47dbaa8a22ac79726e8303f1db5af`
- FFmpeg: `094a2f8a2a5e7fa64736e067de224ce28fdf5979`
- Upstream build toolchain: Android NDK r30.

The checked-in mpv client header is from the same mpv commit and retains its
license notice. Generated binaries are ignored. Media Center is GPL-3.0-only.
Before public distribution, archive and ship the complete corresponding
source, dependency licenses, patches and build instructions for the bundled
engine. An upstream binary link alone is not our distribution source package.

The default output is Android AudioTrack. Decoding the original FLAC does not
establish bit-perfect USB output: Android may resample or process it. The
player exposes MPV input and output sample rates. Exclusive USB output and
DAC-specific verification remain release requirements, not implied features.


## Pinned source collection

The November 10 source collector retains 22 verbatim upstream archives with exact commits, nested submodule placements and SHA256 hashes. The upstream application's buildscripts/ is an embedded tree at the application commit, not a Git submodule. Its source snapshot contains the dependency configuration and patches. Run mobile-native/scripts/package-native-sources.py to reproduce the local collection; original downloads stay under ignored artifacts/mobile-source-release/.

The bundled C++ runtime embeds an NDK r30 compiler identification for Android LLVM commit 9f872551d3c681d06fd303b36f16ed5c274735eb (clang-r574158c); an older r530567c compiler identification is also present. LLVM, libc++ and libc++abi notices were collected from that exact official Android LLVM revision into mobile-native/licenses/. The source collector includes those runtime notices. This records provenance and notices; it does not claim that Media Center rebuilt upstream binaries bit-for-bit.

The source collection must be distributed alongside the complete application/JNI/build-plugin sources and reviewed transitive notices. It is not sufficient by itself to close every distribution gate.
