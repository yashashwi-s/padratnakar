# Native release workflow

Current candidate: **1.0.10 / version code 12**, package `org.padratnakar.reader`. See [UPLOAD-FIRST.md](UPLOAD-FIRST.md) for the owner handoff. Release binaries and signing material are intentionally outside Git.

## Build and verify

1. Run `npm ci` on a clean checkout, then `npm run check`.
2. Run `npm run build -- --mode native` and then `npx cap sync android`. The native build excludes downloadable Shodash MP3s; push the audio assets to GitHub first so the native audio URLs are available. See [audio delivery](../shodash-audio.md).
3. With Java 21 and the Android SDK configured locally, run `./gradlew assembleRelease bundleRelease` from `android/`.
4. Run `python3 scripts/release/sign.py --private-dir <existing-private-signing-directory> --output <release-directory>`. Supply `JAVA_HOME` and `ANDROID_HOME` through the local environment; never commit machine paths or secrets. Do not use `--create-key` for an existing app.
5. The script signs/verifies APK and AAB, exports a public certificate, and writes `SHA256SUMS.txt`. Confirm package/version, certificate continuity with the previous external APK, and that the latest web/worker/font/layout assets are packaged.
6. Record the source commit, checks, artifact hashes and remaining device-test limits in the release directory. Test the final signed APK on a phone before broad distribution.

A successful build/signature check is not a device test or Play approval. iOS source is maintained but an iOS binary is not produced by this Android workflow.

## Files and ownership

- APK: direct Android distribution; install as an update over a previous release signed with the same key.
- AAB: Play Console submission artifact, not a directly installable file.
- `release-assets/`: icon, feature graphic and historical web-renderer screenshots. Refresh screenshots after visible UI changes; do not describe them as native device captures.
- [Store listing](store-listing.md) and [privacy-policy draft](privacy-policy-draft.md): owner-reviewed publishing inputs, not proof of submission.
- [Historical PWA audit](pwa-audit.md): point-in-time findings; run current installed/offline checks for each release.

Keep the existing signing identity for compatible external updates. If Play distribution should update an externally installed APK, ensure the Play app-signing identity is compatible; follow the Console's current key-import instructions. Signing credentials must never enter Git, screenshots, logs or the distributable packet.

## Required final checks

- Offline cold launch; all four collections, including late pads and shared notes.
- Search (Hindi, Latin, mixed script, numbers), worker initialization, bookmarks and persistence.
- Rapid swipes, pinch/pan, vertical scrolling, navigation while zoomed, large device text.
- Back/exit dialog, Cancel, repeated Back, copy and native image/caption sharing.
- Installed PWA update and offline behavior on Android/iOS browsers separately from native Android.
- Store account, publisher identity, content rights, support/privacy hosting, app-content declarations and any account-specific testing requirements remain owner/Console steps. No publishing is implied by a signed build.

## Prepare the upload handoff

Run `python3 scripts/release/prepare-play.py --release-dir <signed-release-directory> --output <new-packet-directory>`. This validates artifact hashes and listing text limits and creates a ZIP with APK/AAB, listing text, graphics, Console worksheet and closed-test runbook. Old screenshots are explicitly reference-only. It never copies private signing material or uploads anything.

The intended upload account is `yashashwisinghania@gmail.com`. See [Console worksheet](console-worksheet.md) and [closed testing](closed-testing.md). Public support contact remains a separate owner decision.

## iPhone preparation

The iPhone/iPad project uses the same four offline collections and corrected section hierarchy. Its source version is 1.0.10, build 12. See [the iOS build and account handoff](ios.md) for unsigned compilation, remaining device checks, and signing after enrollment. The intended owner account is `yashashwisinghania@gmail.com`; the email is not an Apple Team ID.
