# Downtify server playlist fixture

Version-pinned source-derived manual-playlist behavior for Android native requests. Three fictional saved file records, owned/imported/shared examples, explicit append/remove and rename permissions, and an applied-but-503 control. No audio, permanent downloads, real library or external connection is used. Unsupported routes return 501.

Use the existing Postman simulation with its `downtify` route through ADB reverse 18552. Verify the final playlist state and write observations, not only button or HTTP completion. `__control` can reverse a named playlist for stale-draft refusal, remove edit grants, or apply one write and return an error. Remove the disposable emulator account and stop forwarding afterward.
