# iPhone and iPad preparation

Current source: **1.0.19, build 21**, bundle ID `org.padratnakar.reader`.
Intended owner account: `yashashwisinghania@gmail.com`. Developer enrollment/signing has not been verified by this build workflow; an email address is not an Apple Team ID.

## Last unsigned compilation verified on October 10, 2026 (1.0.8 / build 10)

- Synced the current production web assets and all four Capacitor plugins into the iOS project.
- Successfully compiled the Release configuration for a generic iOS device with signing disabled, using installed Xcode 27.0 beta (27A5194q).
- The app includes all four offline collections and the corrected Pad Ratnakar hierarchy.
- Android and both iOS configurations share version 1.0.8/build 10; a regression check enforces version and bundle-ID consistency.
- Swift package resolutions are committed for repeatable dependency selection.
- The 1024×1024 app icon is opaque RGB. Existing light appearance, scene lifecycle, sharing plugins and file-timestamp privacy declaration remain in place.

This is an **unsigned device compilation**, not an installable IPA, simulator test, TestFlight release, or App Store submission. No iOS simulator runtime was available on this machine. Compilation emitted dependency warnings but no errors.

## Reproduce the unsigned build

With a compatible full Xcode installation selected locally:

```sh
npm ci
npm run check
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/padratnakar-ios-build \
  CODE_SIGNING_ALLOWED=NO build
```

Keep local Xcode selection and paths outside Git. Capacitor 8 requires Xcode 26 or later: [environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup). Use a submission-supported Xcode release for the eventual App Store archive; this beta compilation does not establish upload eligibility.

## After developer enrollment

1. Sign into Xcode with the owner account and select the actual development team on the App target. Do not invent a Team ID or commit signing credentials.
2. Register/confirm the bundle ID and create the app record in App Store Connect. Confirm publisher, support contact, privacy-policy URL and distribution details. The supplied account email is not automatically published as a support address.
3. Build and run on a real iPhone. Check offline cold launch, all collections, corrected sections, search, bookmarks, pinch/pan, large text, safe areas, rotation, copy, and image-plus-link sharing. Check iPad presentation too before claiming iPad validation.
4. Archive a signed Release build with a submission-supported Xcode installation, validate, and distribute to TestFlight. Complete the actual privacy/export-compliance and review questions using the final app behavior.
5. Capture screenshots from the tested native app; existing web previews are not native-device evidence.

The next engineering step is simulator/device testing. Signing and TestFlight distribution remain pending enrollment and the real team configuration.
