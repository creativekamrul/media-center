# Android cache and playlist recovery

Downloads keep original media in the user's selected shared folder. Existing cached files are reused; pause and cancellation stay explicit. A resumed interrupted file restarts its transfer rather than claiming byte-range continuation.

Each new transfer uses a private native journal and a unique temporary/final filename. After an app/process restart, recovery deletes only the journal's known temporary file. A completed rename can be recovered into the cache catalog only after its byte count and SHA256 match. A changed or conflicting final file is preserved for review. Denied folder access keeps the journal available for retry; select/restore the folder's access and resume from Cache.

This protects the tested process-death windows. Android document providers do not offer a cross-provider filesystem/database transaction, and some providers can reject creation or rename. Those failures must not delete unrelated files or be reported as completed originals. Android force-stop still requires reopening the app; unattended reboot continuation and uninterrupted huge background transfers are not promised.

## Portable playlists

New exports use relative Music/Videos paths and native ownership records. A filename alone never authorizes overwriting an existing playlist. If a tracked export was edited externally, the app preserves it rather than silently replacing those edits.

For an older untracked export, open **Cache → Link existing playlist export** and select an M3U8/UTF-8 M3U in that Cache folder's **Playlists** directory. The preview resolves every path to an unambiguous cached source, retaining order and repeated entries. Confirm **Link** to authorize future cached-file removals to update that selected playlist. Linking itself does not rewrite the file. A changed file/library or expired preview requires another preview.

URL entries, traversal, files outside the selected Playlists directory, unknown/ambiguous cached sources, invalid UTF-8 and oversized lists are rejected. Unknown external playlists are never discovered and adopted automatically. Newly tracked exports and explicitly linked legacy exports are checked before cache removals change them.

## Bounded acceptance — November 10, 2026

The isolated native Android test app passed generated-original transfer, completed-file reuse, SHA256 corruption reporting without deletion, truncated response refusal, failed storage writes, rename failure cleanup, pause, denied folder access/retry, explicit legacy linking, stale-preview refusal and protection of externally edited exports. Separate processes passed interrupted temporary-file cleanup and verified finalized-file adoption. These are generated/local-provider checks, not Samsung overnight or real removable-storage certification.
