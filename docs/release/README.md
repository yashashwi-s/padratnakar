# Current release: 1.0.0 / version code 2

Start with [UPLOAD-FIRST.md](UPLOAD-FIRST.md). A signed APK for direct distribution, signed AAB, store graphics, listing copy and policy draft are prepared in the task workspace’s `play-release-1.0.0` folder and ZIP. Private signing material is outside that package and Git. The user reports testing completed. PWA verification limits are in [pwa-audit.md](pwa-audit.md).

Pending owner input: public publisher/support contact, rights confirmation, Console account type, audience/ratings declarations and privacy-policy hosting. Signed artifacts are prepared; nothing has been uploaded to Play Console.

The earlier planning snapshot below is historical; use the upload guide for current state.

# Google Play release packet — पद रत्नाकर

Prepared 24 September 2026. This packet is a release-preparation record, not a publishing instruction. It does not create a build, account, key, credential, listing, or Play Console release.

## Release snapshot

| Item | Observed state | Release decision |
| --- | --- | --- |
| Package | `org.padratnakar.reader` | Keep unless the product owner intentionally changes the Play identity. |
| Version | `versionCode 1`, `versionName 1.0` | First release number is usable; increment `versionCode` for every later Play track release. |
| SDK | min 24; compile/target 36 | Meets the new mobile-app submission target of Android 16/API 36 from 31 August 2026. |
| Distribution artifact | Revision 4 debug APK and unsigned release AAB built; packaged web assets verified | **Blocked.** Produce and verify a signed release AAB before a testing-track release. |
| Signing | No release signing configuration inspected | **Blocked.** Establish an upload-key process and enrol in Play App Signing; never store keys in this repository. |
| Runtime model | Static offline reader; bundled corpus/assets; no login, analytics, or backend stated | Complete the Data safety form only after final-binary and dependency review. |
| Network declaration | Manifest requests `INTERNET`; code contains reserved `.example` links in the user-initiated share caption | **Blocked for public release.** Replace the placeholder Android, iOS, and reader URLs, or remove them; re-test the final build. |

The source currently provides 1,565 canonical pads and the 18-entry Shodash Geet sequence. Its documented reader functions include search, local bookmarks, whole-page pinch zoom, and sharing the full positioned pad plus footnotes as a PNG. The share target is chosen by the user; the app itself has no described account or service.

## First: test APK

Use this stage to validate the existing debug route on real Android hardware before any store-release work. This is intentionally an APK test, not a Play production artifact.

1. Have the responsible developer create a fresh debug APK from the current, synced native project and install it on at least one supported physical Android device.
2. Record device model, Android version, APK version, install source, result, and defects. Test cold launch, offline launch after airplane mode, opening a long pad and a shared-footnote pad, search, bookmark persistence, Shodash Geet, pinch/pan at 1–3×, back navigation, copy, and share-to-another-app.
3. Confirm that the share sheet carries the PNG and that the visible caption still contains the reserved `.example` URLs. Do not distribute that caption outside the test group.
4. Test on a 64-bit Android 15+ 16 KB page-size environment. The project appears to be Java/Kotlin/Capacitor-based, but revision 4 APK/AAB inspection found no native `.so` libraries; runtime device compatibility still needs testing.
5. Log pass/fail evidence and fix only confirmed issues. Then rebuild the web assets, sync native assets, and repeat this device test against the candidate release build.

Google permits debuggable APKs for Internal App Sharing, but those uploads cannot become testing or production-track releases. Internal-sharing links expire after 60 days. See [Internal App Sharing](https://support.google.com/googleplay/android-developer/answer/9844679?hl=en).

## Then: Play-ready AAB and store setup

1. Resolve the placeholder share URLs and decide whether sharing an external reader link is a supported product promise. Confirm the creator/publisher has the right to distribute the corpus, logo, fonts, screenshots, and all listing artwork.
2. Create a release AAB with a protected upload key outside the repository. New Play apps publish as AABs and use Play App Signing; Google can generate the app-signing key while the publisher keeps a separate upload key. See [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en) and [AAB testing](https://developer.android.com/guide/app-bundle/test).
3. Upload the signed AAB to an internal test first. Inspect Play Console’s generated device artifacts and install on physical devices. Re-run the test matrix above, including offline reading and sharing.
4. Test 16 KB memory-page compatibility on a 64-bit Android 15+ environment and retain the result. Google requires this support for apps targeting API 35+; enforcement for non-compatible update releases starts 1 February 2027. Apps that use only Java/Kotlin code already support it, but Google still recommends testing. See [16 KB page-size support](https://developer.android.com/guide/practices/page-sizes).
5. Publish the draft privacy policy at a stable public URL, provide a real support contact, complete App content (Data safety, content rating, target audience, ads declaration, and required app-access information), and enter the listing drafts in [store-listing.md](store-listing.md).
6. Upload the required visual assets described in [store-listing.md](store-listing.md). The two minimum screenshots must be actual in-app captures; use four phone screenshots at 1080 × 1920 for better eligibility.
7. If the Play Console account is a personal account created after 13 November 2023, run a closed test with at least 12 people opted in continuously for 14 days, then apply for production access. Device verification may also be required for a new personal account. See [personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB) and [device verification](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en).
8. Before production rollout, re-check all declarations against the final AAB and every packaged dependency. Approve only after the owner supplies the missing identity, support contact, distribution-rights confirmation, hosted privacy-policy URL, and test evidence.

## Required ownership decisions still pending

- Play Console account owner and verified developer identity.
- Public developer/support contact and a stable URL for the privacy policy.
- Countries/regions, price/free status, category, target audience, content-rating answers, and advertising declaration.
- Authority to publish the text corpus, source notes, logo/icon, Noto Serif Devanagari font, screenshots, and promotional graphics.
- Final Android, iOS, and web-reader URLs used in the share caption.
- Release-key custodian, recovery process, closed-test testers, and physical-device evidence.

## Primary Google references

- [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
- [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB)
- [Personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)

## Prepared artifacts

- `release-assets/play-icon-512.png`: borderless 512 × 512 Play icon.
- Revision 4 debug APK and unsigned release AAB: build hashes and checks in `docs/reader-audit.md`; artifacts are kept outside Git in the task’s `android-builds` output folder.
- Hindi/English listing copy: `store-listing.md`.
- Privacy policy draft: `privacy-policy-draft.md`; fill owner/contact details and host before submission.

Still needed: real-device screenshots, 1024 × 500 feature graphic, release signing, public support/privacy details, real share links and account-specific Console declarations/testing. No upload or publication has occurred.
