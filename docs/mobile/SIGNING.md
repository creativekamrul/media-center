# Android production signing

The permanent signing identity is backed up in the user's Bitwarden cloud vault in the item **Media Center Android Signing**. It is a Login item with alias `media-center-mobile` as the username, its keystore password in the Password field, and the complete encrypted PKCS12 file encoded as Base64 in Notes. The Notes copy was decoded and its SHA256 verified after import.

No Windows DPAPI password copy is needed. The original unused Windows-protected key was retired before any APK was signed with it. Current development previews still use their existing development certificate; production-key migration must not clear the user's installation data without a reviewed migration path.

## Build from the vault

Run `powershell -NoProfile -ExecutionPolicy Bypass -File mobile-native/scripts/build-from-bitwarden.ps1` from the repository root. Paste the Base64 line and Password field when prompted; input is hidden. The script verifies the key checksum, creates a temporary key file for signing, and removes that file and restores process environment settings after the build. The vault remains the backup source. If the process is forcibly terminated, inspect/remove the temporary `MediaCenter-Signing-*` folder before sharing the machine.

Keystore file SHA256: `4caa7a7352a70c56070ed6a63d496ccfb00fb3e543f6103f88796ec78bd3a124`.
This checksum is public metadata, not a password. Never commit the keystore, its encoded content, password, vault export or temporary import file. Never replace this permanent key for a routine app update.

Keep a separate secure recovery backup of the Bitwarden vault. Protect the Bitwarden account and retain its recovery information. Public distribution remains a separate, explicitly authorized release step.


## Verified signing checkpoint — November 11, 2026

The existing Bitwarden key and the user-entered correct password successfully signed the locally verified rc.2 candidate. The temporary key file was removed and Android apksigner independently verified its v2/v3 signatures. No public release or phone certificate migration occurred at this checkpoint.

Permanent certificate SHA256: `058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65`.
Candidate APK SHA256: `e4e6627809d90340589e6df1441ca449542df1abdf07713e2e6e7ab78f7fedc6`.

The one-use loopback helper in scripts/sign-vault-local.py signs only its fixed, hash-verified local candidate and accepts a user-entered password through an Origin-checked capability URL. It binds only to 127.0.0.1, never logs submitted credentials and removes its temporary PKCS12 after signing. Browser automation may expose password values as a redacted placeholder; never save or submit that placeholder as the keystore password. For normal subsequent builds, use build-from-bitwarden.ps1 with direct hidden input.


The final v1.0.0 phone and emulator APKs and the rc.2 emulator migration predecessor were batch-signed and independently verified under that same certificate. The loopback form was shut down after signing. The isolated QA emulator restored an encrypted development backup under the permanent identity, retained both fictional connections and the output profile, played authenticated media and updated in place from signed code 8 to code 9. The user's Samsung development installation remains intact; Android cannot replace its development certificate with this key without the documented backup/fresh-install migration.
