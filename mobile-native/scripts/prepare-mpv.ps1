param([string]$DependencyCache = '')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$root = Split-Path $project -Parent
if (!$DependencyCache) { $DependencyCache = Join-Path $root 'artifacts\mobile-native-deps' }
$version = '2026-09-17'
$expected = '0b0e0a534dd6b8d2b117f06952e0600064ad97702e48bff02543e3e32107803d'
New-Item -ItemType Directory -Force -Path $DependencyCache | Out-Null
$archive = Join-Path $DependencyCache "mpv-android-$version-arm64.apk"
if (!(Test-Path -LiteralPath $archive)) {
 Invoke-WebRequest -Uri "https://github.com/mpv-android/mpv-android/releases/download/$version/app-default-arm64-v8a-release.apk" -OutFile $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'MPV dependency checksum mismatch.' }
$target = Join-Path $project 'modules\media-library\android\src\main\jniLibs\arm64-v8a'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
try {
 $runtimeTarget = Join-Path $project 'native-runtime\arm64-v8a'
 New-Item -ItemType Directory -Force -Path $runtimeTarget | Out-Null
 [System.IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry('lib/arm64-v8a/libc++_shared.so'),(Join-Path $runtimeTarget 'libc++_shared.so'),$true)
 foreach ($name in @('libmpv.so','libavcodec.so','libavdevice.so','libavfilter.so','libavformat.so','libavutil.so','libswresample.so','libswscale.so')) {
  $entry = $zip.GetEntry("lib/arm64-v8a/$name")
  if (!$entry) { throw "Missing native dependency $name" }
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $target $name),$true)
 }
} finally { $zip.Dispose() }
Write-Output "Verified MPV Android $version (arm64)."

$ninjaDir = Join-Path $DependencyCache 'ninja'
New-Item -ItemType Directory -Force -Path $ninjaDir | Out-Null
$ninjaZip = Join-Path $ninjaDir 'ninja.zip'
if (!(Test-Path -LiteralPath $ninjaZip)) { Invoke-WebRequest 'https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-win.zip' -OutFile $ninjaZip }
if ((Get-FileHash -LiteralPath $ninjaZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne '07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65') { throw 'Ninja checksum mismatch.' }
Expand-Archive -LiteralPath $ninjaZip -DestinationPath $ninjaDir -Force
