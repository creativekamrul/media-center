# Android backup and migration

Use **Menu → Settings → About → Encrypted migration backup** before changing phones or replacing a development-signed preview with the permanent-key release.

1. Stop audio, close video and pause transfers. Wait for pending server progress reports and file verification to finish.
2. Enter a unique password of at least 12 characters. Keep it in your password manager, separately from the backup. The app cannot recover it.
3. Choose **Save encrypted backup**, then save the `.mcbackup` file with Android's file picker. Copy it off the device before uninstalling anything.
4. Enter the password again and choose **Verify or preview backup**. Check that verification succeeds. Verification on an existing installation is read-only.
5. On a fresh destination installation, open the same screen, select the verified file and inspect the counts. Choose **Restore migration backup** and confirm.
6. Select your local-media and Cache folders again, test each connection and review automatic rules before enabling them.

Android will not install a differently signed APK over the existing package. Do not uninstall a preview until its backup is saved elsewhere and verified. Ordinary updates signed with the same permanent key do not require uninstalling.

## Included

Saved connections and credentials; appearance, audio and playback preferences; app playlists, collections, pins, saved mixes and their snapshots; bookmarks/notes; listening history; podcast inbox and rules; music/spoken/video checkpoints; custom lyrics, transcripts and artwork.

Credentials are decrypted only in native code and re-encrypted with the destination device's Android Keystore. The portable archive uses password-derived AES-256-GCM with a random salt and IV. Changing the password cannot repair a damaged archive.

## Excluded

Original downloaded media, active transfer jobs, the cache catalog, device-local media indexes, Android folder grants and live server playback sessions are excluded. Your existing shared-folder media is not deleted by restore. Re-select folders; use those files as local audio or cache selected content again. This is personal-data migration, not a copy or seamless reattachment of a 200 GB media cache.

Archives are limited to 64 MiB. Automatic cache rules, predictive caching, automatic continuation and source fallback are turned off after restore. Saved mix recipes switch to manual refresh. Restore requires a fresh installation and does not merge into an existing personal library.

Preview authenticates and validates the archive before changing data and expires after five minutes. The native rollback journal recovers an interrupted restore on the next launch. If recovery cannot complete, the app blocks playback and offers an explicit recovery retry rather than silently continuing with uncertain state.

## Acceptance evidence — November 10, 2026

The disposable Android QA installation passed encrypted export/verification, wrong-password refusal, destination Keystore re-encryption, assets/history/inbox/mix restoration, fresh-install refusal, failed-write rollback and separate-process restart recovery before and after commit. Android's actual system file picker also passed a zero-connection settings export, preview, confirmation and restore. These checks do not replace the final physical-device migration and permanent-key upgrade checks.
