param(
  [Parameter(Mandatory=$true)][string]$InstallDirectory,
  [Parameter(Mandatory=$true)][string]$ExecutableName,
  [ValidateSet('Check','Close')][string]$Mode = 'Check',
  [int]$InstallerPid = 0
)
$ErrorActionPreference = 'Stop'
try {
  if ([IO.Path]::GetFileName($ExecutableName) -ne $ExecutableName) { throw 'Invalid application filename.' }
  $installRoot = [IO.Path]::GetFullPath($InstallDirectory)
  $appPath = Join-Path $installRoot $ExecutableName
  # Detect write/permission failures before extraction, with an accurate message.
  [IO.Directory]::CreateDirectory($installRoot) | Out-Null
  $probePath = Join-Path $installRoot ('.media-center-write-' + [Guid]::NewGuid().ToString('N'))
  $probe = New-Object IO.FileStream($probePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None, 4096, [IO.FileOptions]::DeleteOnClose)
  $probe.Dispose()
  # A clean install cannot have a running installed application. Do not inspect
  # unrelated processes in Downloads, sibling folders, or another installation.
  $helperPath = Join-Path $installRoot 'resources\smtc\MediaCenter.MediaControls.exe'
  if (!(Test-Path -LiteralPath $appPath -PathType Leaf) -and !(Test-Path -LiteralPath $helperPath -PathType Leaf)) { exit 0 }
  function Get-InstalledProcesses {
    @(Get-Process | Where-Object {
      try { $_.Id -ne $PID -and $_.Id -ne $InstallerPid -and $_.Path -and ($_.Path -ieq $appPath -or $_.Path -ieq $helperPath) }
      catch { $false }
    })
  }
  $running = @(Get-InstalledProcesses)
  if (!$running.Count) { exit 0 }
  if ($Mode -eq 'Check') { exit 10 }
  # Ask the app to flush playback checkpoints and release its native helpers.
  if (@($running | Where-Object { $_.Path -ieq $appPath }).Count) {
    Start-Process -FilePath $appPath -ArgumentList '--quit-for-install' -WindowStyle Hidden
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(12)
  do {
    Start-Sleep -Milliseconds 250
    $running = @(Get-InstalledProcesses)
  } while ($running.Count -and [DateTime]::UtcNow -lt $deadline)
  # Older versions do not understand the graceful exit request. After the user
  # accepts the close prompt, stop only these exact executable paths.
  foreach ($process in $running) {
    $current = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
    if ($current -and ($current.Path -ieq $appPath -or $current.Path -ieq $helperPath)) { Stop-Process -InputObject $current -Force }
  }
  Start-Sleep -Milliseconds 300
  if (@(Get-InstalledProcesses).Count) { throw 'The installed application is still running. Close it from the tray and retry.' }
  exit 0
} catch {
  Write-Output ('Media Center could not prepare the selected installation folder. ' + $_.Exception.Message)
  exit 20
}
