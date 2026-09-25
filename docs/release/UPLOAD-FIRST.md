# Upload guide — 1.0.0 (version code 2)

## Ready files

- `pad-ratnakar-1.0.0.apk`: signed release for direct Android distribution.
- `pad-ratnakar-1.0.0.aab`: signed bundle for Play Console.
- `store-assets/`: icon, feature graphic and actual app web-renderer screenshots at phone proportions. These are not native device captures; review against the tested phone before upload.
- `store-listing.md`: Hindi and English descriptions.
- `privacy-policy-draft.md`: only publisher/contact/hosting details remain to fill.
- `SHA256SUMS.txt`: file verification hashes.

## Your remaining steps

1. Supply public publisher name, support email and rights confirmation. Host the completed policy at a public URL (the existing Vercel site can host it).
2. Create the app in Play Console: app, Books & Reference, Hindi default language, free if intended. Add the listing and prepared graphics.
3. App content: no ads; no login/restricted access. Native app has no analytics or user-data collection. Confirm Data safety, audience and content-rating answers against the actual book; do not invent a rating.
4. Signing: use **your existing app-signing key**, not a newly Google-generated key, if users of the external APK should receive Play updates without reinstalling. Console supplies its PEPK export tool and encryption key; use those to import the private signing key. Never upload the raw private key/password as listing assets. Public certificate is included. A separate upload key can be registered afterward.
5. Upload the AAB, use the release notes below, and complete Console review/rollout. A newer personal account may still require 12 opted-in testers for 14 continuous days. Your completed phone testing does not replace this account-specific Google requirement.

## Release notes

<hi-IN>
पद रत्नाकर का प्रथम संस्करण: 1,565 पद, षोडश गीत, ऑफ़लाइन पाठ, खोज, बुकमार्क, पिंच ज़ूम और पद-चित्र साझा करना।
</hi-IN>
<en-US>
First release: 1,565 pads, Shodash Geet, offline reading, search, bookmarks, pinch zoom and image sharing.
</en-US>

## Direct installation

Share only the APK. Android may request permission to install from the receiving app. Previous debug/test APKs use a different signature and must be uninstalled first; this removes their local bookmarks. Future release updates must use this same private key and a higher version code.

## Keep private

The signing key/password are outside Git and outside this package in the task workspace’s `release-signing-private` directory. Back up both securely before distributing the first release. Losing the external signing key prevents compatible external updates. No store upload or policy publication has been performed.
