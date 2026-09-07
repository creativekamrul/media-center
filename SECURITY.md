# Security and privacy

A private security reporting address is not configured yet. Until a repository advisory channel exists, contact the maintainer privately through an established channel. Do not put secrets, databases or exploit details in a public issue.

The renderer is sandboxed with Node disabled and context isolation enabled. Navigation/new windows are blocked and permissions denied. IPC handlers validate their caller and schema. No arbitrary shell, filesystem or MPV interface is exposed.

Credentials use OS encryption through Electron safeStorage. SQLite also holds unencrypted metadata, local paths, queues, checkpoints, plans and history. Do not share the database. Encryption does not protect an already-compromised logged-in OS account.

Authenticated URLs remain in main and are sent to MPV over a unique local IPC endpoint, not command-line arguments. Choose a trusted MPV installation. The app does not bundle or update MPV.

Selected local roots are canonicalized; every file access checks containment, including links/junctions. Media is read, never changed. Remote artwork is MIME/size restricted; descriptions render as plain text.

No analytics or crash-upload backend exists. Network activity goes to configured media servers and radio/audio hosts, plus GitHub and its release CDN when the user checks for or downloads updates. The packaged update provider is fixed; only check/download/install operations cross validated IPC. No GitHub token is bundled. Downloaded installers are checked against release SHA-512 metadata; this is integrity verification, not publisher signature authentication. Builds are currently unsigned. Signing, a reporting channel and a complete security audit remain release-hardening work.
