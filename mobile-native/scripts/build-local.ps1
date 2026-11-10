param([switch]$Emulator,[switch]$Production,[switch]$RegenerateNative)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$root=Split-Path $project -Parent
function Checked([scriptblock]$Work){ & $Work; if($LASTEXITCODE -ne 0){throw 'Build command failed; no delivery APK was copied.'} }
if($Production -and $Emulator){throw 'Production and emulator builds are separate targets.'}
if($Production){foreach($name in @('MEDIA_CENTER_KEYSTORE','MEDIA_CENTER_STORE_PASSWORD','MEDIA_CENTER_KEY_ALIAS','MEDIA_CENTER_KEY_PASSWORD')){if(![Environment]::GetEnvironmentVariable($name)){throw "Missing production signing configuration: $name"}};if(!(Test-Path -LiteralPath $env:MEDIA_CENTER_KEYSTORE)){throw 'Production signing key not found.'};$env:MEDIA_CENTER_SIGNING_REQUIRED='1'}else{$env:MEDIA_CENTER_SIGNING_REQUIRED='0'}
if(!$env:JAVA_HOME){$env:JAVA_HOME=Join-Path $env:ProgramFiles 'Android/Android Studio/jbr'}
if(!$env:ANDROID_HOME){$env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android/Sdk'}
$env:NODE_ENV='production';$env:CMAKE_BUILD_PARALLEL_LEVEL='2'
$ninja=Join-Path $root 'artifacts/mobile-native-deps/ninja/ninja.exe'
if(Test-Path -LiteralPath $ninja){$env:MEDIA_CENTER_NINJA=$ninja}
Push-Location $project
try {
 Checked {npm run typecheck};Checked {npm run lint};Checked {npm test}
 & (Join-Path $PSScriptRoot 'prepare-mpv.ps1')
 if($RegenerateNative -or !(Test-Path -LiteralPath (Join-Path $project 'android/gradlew.bat')) -or $Production){Checked {npx expo prebuild --platform android --no-install}}
 Push-Location (Join-Path $project 'android')
 try {$legacy=if($Emulator){'true'}else{'false'};Checked {.\gradlew.bat :media-library:lintDebug :media-library:testDebugUnitTest :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a' "-Pexpo.useLegacyPackaging=$legacy" '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m' --max-workers=1 --no-parallel --init-script ../scripts/low-memory.gradle --console=plain}}
 finally {Pop-Location}
 $version=(Get-Content app.json -Raw | ConvertFrom-Json).expo.version
 $suffix=if($Emulator){'preview-emulator-arm64'}elseif($Production){'arm64'}else{'preview-arm64'}
 $delivery=Join-Path $root 'release/mobile';New-Item -ItemType Directory -Force -Path $delivery | Out-Null
 $target=Join-Path $delivery "Media-Center-Mobile-$version-$suffix.apk"
 Copy-Item -LiteralPath 'android/app/build/outputs/apk/release/app-release.apk' -Destination $target
 $hash=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
 [IO.File]::WriteAllText($target+'.sha256',"$hash  $([IO.Path]::GetFileName($target))`n")
 Write-Output "Built locally: $target"
} finally {Pop-Location}
