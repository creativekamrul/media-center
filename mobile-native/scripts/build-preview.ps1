param([switch]$Emulator, [string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk", [string]$JdkPath = 'C:\Program Files\Android\Android Studio\jbr')
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path -LiteralPath (Join-Path $SdkPath 'platform-tools\adb.exe'))) { throw 'Android SDK platform-tools are missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $JdkPath 'bin\java.exe'))) { throw 'Android Studio JDK is missing.' }
$env:ANDROID_HOME = $SdkPath
$env:JAVA_HOME = $JdkPath
$env:PATH = "$JdkPath\bin;$env:PATH"
$env:NODE_ENV = 'production'
$env:MEDIA_CENTER_NINJA = (Join-Path (Split-Path $projectPath -Parent) 'artifacts\mobile-native-deps\ninja\ninja.exe').Replace('\','/')
Push-Location $projectPath
try {
  & (Join-Path $PSScriptRoot 'prepare-mpv.ps1')
  & npm.cmd run typecheck
  if ($LASTEXITCODE) { throw 'TypeScript check failed.' }
  & npm.cmd test
  if ($LASTEXITCODE) { throw 'Tests failed.' }
  & npm.cmd run lint
  if ($LASTEXITCODE) { throw 'Lint failed.' }
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE) { throw 'Android generation failed.' }
  Push-Location android
  try {
    $packaging = if ($Emulator) { '-Pexpo.useLegacyPackaging=true' } else { '-Pexpo.useLegacyPackaging=false' }
    & .\gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a' $packaging --console=plain
    if ($LASTEXITCODE) { throw 'APK build failed.' }
  } finally { Pop-Location }
  $outputPath = Join-Path (Split-Path $projectPath -Parent) 'release\mobile'
  New-Item -ItemType Directory -Force $outputPath | Out-Null
  $version = (Get-Content -LiteralPath 'app.json' -Raw | ConvertFrom-Json).expo.version
  $variant = if ($Emulator) { "emulator" } else { "preview-arm64" }
  $apkPath = Join-Path $outputPath "Media-Center-Mobile-$version-$variant.apk"
  Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination $apkPath -Force
  $apkArchive = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
  try {
    $runtimeEntry = $apkArchive.GetEntry('lib/arm64-v8a/libc++_shared.so')
    if (!$runtimeEntry) { throw 'Packaged native runtime is missing.' }
    $runtimeStream = $runtimeEntry.Open()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $runtimeHash = [Convert]::ToHexString($sha.ComputeHash($runtimeStream)) }
    finally { $runtimeStream.Dispose(); $sha.Dispose() }
    if ($runtimeHash -ne (Get-FileHash 'native-runtime\arm64-v8a\libc++_shared.so' -Algorithm SHA256).Hash) { throw 'APK contains the wrong native runtime.' }
  } finally { $apkArchive.Dispose() }
  Write-Output "Local test APK (development signing key): $apkPath"
} finally { Pop-Location }
