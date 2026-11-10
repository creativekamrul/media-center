param([switch]$RegenerateNative)
$ErrorActionPreference='Stop'
$expected='4caa7a7352a70c56070ed6a63d496ccfb00fb3e543f6103f88796ec78bd3a124'
function Reveal([Security.SecureString]$Secret){$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}}
Write-Host 'Open Bitwarden: Media Center Android Signing.'
$encoded=Read-Host 'Paste only the Base64 key-file line from Notes (input hidden)' -AsSecureString
$password=Read-Host 'Paste the Password field (input hidden)' -AsSecureString
$temporaryDirectory=Join-Path ([IO.Path]::GetTempPath()) ('MediaCenter-Signing-'+[guid]::NewGuid().ToString('N'))
$keyFile=Join-Path $temporaryDirectory 'release.p12'
$names=@('MEDIA_CENTER_KEYSTORE','MEDIA_CENTER_STORE_PASSWORD','MEDIA_CENTER_KEY_ALIAS','MEDIA_CENTER_KEY_PASSWORD','MEDIA_CENTER_SIGNING_REQUIRED')
$previous=@{};foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name)}
try {
 New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
 $bytes=[Convert]::FromBase64String((Reveal $encoded).Trim())
 [IO.File]::WriteAllBytes($keyFile,$bytes);[Array]::Clear($bytes,0,$bytes.Length)
 if((Get-FileHash -LiteralPath $keyFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Key checksum does not match the permanent Bitwarden signing key.'}
 $env:MEDIA_CENTER_KEYSTORE=$keyFile;$env:MEDIA_CENTER_KEY_ALIAS='media-center-mobile'
 $env:MEDIA_CENTER_STORE_PASSWORD=Reveal $password;$env:MEDIA_CENTER_KEY_PASSWORD=$env:MEDIA_CENTER_STORE_PASSWORD
 & (Join-Path $PSScriptRoot 'build-local.ps1') -Production -RegenerateNative:$RegenerateNative
} finally {
 foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
 if(Test-Path -LiteralPath $keyFile){Remove-Item -LiteralPath $keyFile -Force}
 if(Test-Path -LiteralPath $temporaryDirectory){Remove-Item -LiteralPath $temporaryDirectory -Force}
 $encoded.Dispose();$password.Dispose()
}
