param([string]$Serial='emulator-5556',[string]$SdkPath="$env:LOCALAPPDATA\Android\Sdk")
$ErrorActionPreference='Stop'
$workspace=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$adb=Join-Path $SdkPath 'platform-tools/adb.exe'
$apk=Join-Path $workspace 'mobile-native/modules/media-library/android/build/outputs/apk/androidTest/debug/media-library-debug-androidTest.apk'
if($Serial -notmatch '^emulator-\d+$'){throw 'A disposable Android emulator is required.'}
$avd=(& $adb -s $Serial emu avd name | Select-Object -First 1).Trim()
if($LASTEXITCODE -or $avd -ne 'Media_Center_Migration_QA'){throw 'Refusing to run outside the dedicated migration QA emulator.'}
$package='local.mediacenter.library.test'
$component=$package+'/local.mediacenter.library.MigrationTestRunner'
$reports=Join-Path $workspace 'artifacts/mobile-native-tests'
New-Item -ItemType Directory -Force -Path $reports | Out-Null
& $adb -s $Serial install -t -r $apk
if($LASTEXITCODE){throw 'Could not install the isolated test APK.'}
$results=@()
foreach($mode in @('normal','seed-uncommitted','verify-uncommitted','seed-committed','verify-committed','transfer-normal','transfer-seed-partial','transfer-verify-partial','transfer-seed-final','transfer-verify-final','audio-normal','artwork-normal','fallback-normal')){
 if(($mode.StartsWith('verify-') -or $mode.Contains('-verify-'))){& $adb -s $Serial shell am force-stop $package;if($LASTEXITCODE){throw 'Could not stop the isolated test process.'}}
 $output=(& $adb -s $Serial shell am instrument -w -e migrationMode $mode $component 2>&1 | Out-String)
 Set-Content -LiteralPath (Join-Path $reports ('migration-'+$mode+'-runtime.log')) -Value $output -Encoding utf8
 $expected=if(($mode.StartsWith('seed-') -or $mode.Contains('-seed-'))){'MC_RESULT=SEEDED'}else{'MC_RESULT=PASS'}
 if($LASTEXITCODE -or !$output.Contains($expected)){throw ('Migration runtime failed in '+$mode+'. See the isolated runtime log.')}
 $results+=@{mode=$mode;passed=$true}
 Write-Output ('PASS '+$mode)
}
@{serial=$Serial;avd=$avd;package=$package;apkSha256=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant();cases=$results} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $reports 'migration-native-acceptance.json') -Encoding utf8
# Only this disposable test package is removed; the user's Media Center installation is separate.
& $adb -s $Serial uninstall $package
if($LASTEXITCODE){throw 'Tests passed, but isolated test APK cleanup failed.'}
