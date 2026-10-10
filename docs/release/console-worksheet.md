# Play Console worksheet

Prepared for Android 1.0.8 (code 10). This is a preparation sheet, not a record of Console submission.

## Account and identity

- Upload account: `yashashwisinghania@gmail.com` (confirmed by owner).
- Account registration/payment/identity verification: not completed here.
- Select Personal if publishing as yourself; Organization only for an actual qualifying organization. Do not choose an account type to evade testing requirements.
- Public developer name: owner decision. Upload-account email is not automatically the public support email.
- Public support email: owner to confirm (the upload email may be reused if desired).
- App name: पद रत्नाकर; default language: Hindi (`hi-IN`); type: App.
- Suggested category: Books & Reference. Suggested pricing: free; owner decides before submission.
- Package ID: `org.padratnakar.reader`; release name: `1.0.8 (10)`.

## Paste-ready listing

Use `release-assets/listing/hi-IN/` for the default listing and `en-US/` for an English translation. Each contains title, short description and full description in individual text files. The listing describes all four collections and only existing native features.

## App content — proposed answers to verify in Console

| Item                      | Current implementation / action                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App access                | All reading/search features available without login; no credentials or special instructions required.                                                          |
| Ads                       | No in-app ads.                                                                                                                                                 |
| Purchases/subscriptions   | None implemented.                                                                                                                                              |
| Account creation/deletion | No user accounts or account creation.                                                                                                                          |
| Data safety               | Native reader does not intentionally collect/transmit personal data or include web analytics. Confirm the final dependency/binary behavior; see privacy draft. |
| Permissions               | Internet permission; clipboard/share are user initiated. No camera, contacts or location request in app code.                                                  |
| Local data                | Bookmarks/last read location; generated share images in cache. Android backup is enabled and subject to OS/account settings.                                   |
| Target audience           | Owner decision based on intended users. Do not automatically select all ages or claim Families compliance.                                                     |
| Content rating            | Complete the actual IARC questionnaire against the entire book. Do not preassign a rating.                                                                     |
| Privacy policy            | Finalize publisher/contact/effective date and host at a public URL; draft is in packet. Not hosted by this task.                                               |
| Distribution regions      | Owner decision; do not assume worldwide distribution.                                                                                                          |

Website/PWA analytics are separate from the native APK. Do not copy the native no-analytics statement into a combined website policy without that distinction.

## Signing decision before first Play upload

The external APK is already signed with an existing private key. To let Play update those installations, the Play app-signing certificate must match that identity. Follow Play's current existing-key import/PEPK workflow. The public certificate can be inspected freely; the private key/password remain outside the upload packet. Do not casually accept a different Google-generated app-signing key if seamless migration from the external APK matters.

## Primary references checked during preparation

- Preview assets: https://support.google.com/googleplay/android-developer/answer/9866151
- New personal-account testing: https://support.google.com/googleplay/android-developer/answer/14151465
- Android-device verification: https://support.google.com/googleplay/android-developer/answer/14316361
- Signing: https://support.google.com/googleplay/android-developer/answer/9842756

Live Console requirements take precedence over this worksheet.
