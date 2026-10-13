# Release handoff — 1.0.34 (version code 36)

## Distribution files

- `pad-ratnakar-1.0.34.apk`: signed Android release for external distribution.
- `pad-ratnakar-1.0.34.aab`: signed Play bundle.
- `signing-certificate.pem`: public certificate only.
- `SHA256SUMS.txt`: artifact hashes.
- `RELEASE.md`: build/source record and verification limits.

Files are produced outside Git; use the actual release packet and verify its hashes. Never distribute the private signing folder.

## What changed

The first native Share tap waits for lazy page preparation, shows immediate feedback, and fits text without waiting for WebView animation frames. Android audio now streams directly to persistent storage on a native worker, with incremental size/SHA-256 verification, cancellation, network timeouts and a fallback host. Existing downloaded recordings remain available. Accepted devotional text and positioned page layout are unchanged.

## Owner steps before Play submission

1. Establish the Play developer account and public publisher identity. Proposed support contact: `yashashwisinghania@gmail.com`; confirm before publishing it.
2. Finalize and host the [privacy policy](privacy-policy-draft.md), confirm distribution rights, and review the [listing](store-listing.md).
3. Choose a Play signing setup compatible with the externally distributed APK if updates without reinstalling are required. Follow current Console instructions; never upload the raw private key/password as listing material.
4. Upload the AAB to the appropriate test track. Complete current Console app-content declarations and any account-specific testing/verification requirements.
5. Test the final artifact on physical devices and replace outdated store screenshots before production rollout.

The owner previously reported phone testing complete, but that does not validate changes introduced by this candidate. No Play upload, account purchase or policy publication is performed by building this release.

## Direct APK installation

Use the APK, not the AAB. Android may ask to allow installation from the receiving app. Existing signed 1.0.x installs should update when the same signing identity is used; old debug-signed installs are incompatible. Avoid uninstalling without backing up anything important: local bookmarks can be lost. Keep the existing private key securely backed up for future external updates.
