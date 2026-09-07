param([switch]$DryRun)
# npm on Windows may consume flags instead of forwarding them to PowerShell.
# Support its parsed dry-run settings as a fail-safe; release:preview is preferred.
if ($env:npm_config_dry_run -eq 'true' -or $env:npm_config_dryrun -eq 'true') { $DryRun = $true }
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Executable failed (exit $LASTEXITCODE). Nothing else will be published." }
}
$gh = Get-Command gh -ErrorAction SilentlyContinue
$ghPath = if ($gh) { $gh.Source } else { Join-Path $env:LOCALAPPDATA 'Programs\GitHub CLI\bin\gh.exe' }
if (!(Test-Path -LiteralPath $ghPath)) { throw 'Install GitHub CLI and run gh auth login first.' }
Invoke-Checked node @('scripts/release-check.cjs')
Invoke-Checked $ghPath @('auth', 'status', '--hostname', 'github.com')
$changes = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Initialize and connect the Git repository first.' }
if ($changes) { throw 'Commit your changes before releasing. The version tag must identify reviewed, committed source.' }
$branch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Publish releases from the main branch.' }
Invoke-Checked git @('remote', 'get-url', 'origin')
$manifest = Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json
$tag = 'v' + $manifest.version
$existing = git tag --list $tag
if ($existing) { throw "Local tag $tag already exists. Use a new version; release tags are never moved." }
$remoteTag = git ls-remote --tags origin "refs/tags/$tag"
if ($LASTEXITCODE -ne 0) { throw 'Cannot check remote tags.' }
if ($remoteTag) { throw "Remote tag $tag already exists. Use a new version." }
if ($DryRun) { Write-Output "Ready: create $tag and atomically push main and the tag. GitHub Actions will build the Windows release."; exit 0 }
Invoke-Checked git @('tag', '-a', $tag, '-m', "Media Center $tag")
Invoke-Checked git @('push', '--atomic', 'origin', 'main', "refs/tags/$tag")
Write-Output "Pushed $tag. Watch progress with: gh run list --workflow release.yml"
