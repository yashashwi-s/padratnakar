# Reader audit — 23 September 2026

This records the earlier wrapping-based renderer. It has since been replaced at the user’s request by the [fixed source-positioned page and zoom controls](print-layout.md#reader-implementation). The APK described below predates that change.

The current visual design and existing corpus edits were preserved. This pass focused on responsive inner typography, navigation, and an Android testing build.

## Fixes

- Replaced the fixed typography breakpoint with actual rendered line measurements. Source indentation/group spacing is retained only when it fits. Wrapped lines use the available width, with ordinary word spacing and an unstretched final line.
- Limited expansion between words/groups, and centered short poems in a comfortable measure on wider screens.
- Recompute layout when the container or font changes. Preload the bundled offline font. Hidden measurement copies are clipped and excluded from accessibility.
- Fixed header grid overflow at 320px.
- Left swipe advances; right swipe returns. Ignore taps, slow drags, vertical scrolling, multi-touch, pinch zoom, and text selection. Keyboard navigation ignores editable elements.
- Android Back minimizes the app when there is no previous page, instead of doing nothing. History still handles earlier pages and open menus.
- Display Hindi opening quotation marks as `‘` rather than `'`, preserving the source corpus and provenance.

## Verification

Browser checks used widths 320, 390, 600, 768, 1024 and 1440 CSS pixels, including the minimum 16px and maximum 35.2px reading settings (with a 16px browser root font). Representative checks covered pads 1, 2, 551, 1025 and 1504, Shodash song 2, and the closing entry. Settled layouts had no horizontal clipping or document overflow. Continued footnotes, superscripts and collection headings remained readable. Number search opened pad 550 and next navigation opened 551. No browser warning/error was captured during the responsive checks.

The gesture decision rules have automated regression tests. Physical touch swiping, Android system font scaling, safe areas, hardware Back, and device-specific WebView behavior still need real-device checks. Browser resizing is not a substitute for those checks. An installable debug APK is for this testing, not a store release.

The complete corpus remains eagerly bundled (~6.1MB JavaScript before compression). Vite reports a chunk-size warning. This is a remaining startup-performance consideration, especially on older phones; no content was removed to conceal it.

## Android build

Use JDK 21 and an Android SDK with platform 36. Set `JAVA_HOME` and `ANDROID_HOME` in your own environment; do not commit machine-specific paths.

```sh
npm run check
npm run native:sync
cd android
./gradlew assembleDebug --console=plain
```

The output is `android/app/build/outputs/apk/debug/app-debug.apk`. The Gradle wrapper uses the smaller binary distribution, a pinned official SHA-256 checksum, and a longer download timeout. If Java downloads time out on an IPv6 connection, `JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true` can be set for the build command without changing global Java settings.

Native signing for store distribution and iOS device testing remain outstanding.

## Build result

`npm run check` passed lint, all 28 JavaScript tests, corpus validation, all 21,672 canonical source-position checks, and production build. `npm run native:sync` and Gradle `assembleDebug` succeeded. APK signature verification passed (v2). Every bundled web asset was compared byte-for-byte with the verified `dist/` build, including all 16 layout chunks and the offline font.

- Package: `org.padratnakar.reader`
- Version: `1.0` (code 1)
- Minimum Android SDK: 24; target SDK: 36
- APK size: 10,445,994 bytes
- SHA-256: `9a4f1bddee4acb4c79e2dd687764f9b1f35de17c883115df4b2fdf27cfb7bc87`
- Delivery filename: `pad-ratnakar-2026-09-23-debug.apk`

The artifact is kept outside Git. No store signing credentials were used. The one-time 18:15 IST continuation ran on 23 September 2026; no further recurring run was requested.

## Latest build: 24 September 2026

This supersedes the September 23 artifact above. `npm run check` passes: lint, 33 JavaScript tests, corpus and all 21,672 geometry associations, four review tests, and production build. Android debug compilation and v2 signature verification pass. All bundled web assets match the final web build byte-for-byte.

- Artifact: `pad-ratnakar-2026-09-24-debug.apk` (outside Git).
- Size: 13,755,163 bytes.
- SHA-256: `a9325d803e083a39d1aacda7abbd772436892df74bd39a7f1411cb30b1b51438`.
- Includes inner-page pinch zoom, shorter swipes, copy on long press, full-pad PNG sharing, the earlier 700-weight reading font, line/stanza spacing, and collection corrections. Native page zoom is disabled so app controls stay fixed; the custom inner-page pinch handles enlargement.
- Shodash 10 has one verse asterisk, immediately after भगवान॥३॥, explicitly confirmed by the user. Canonical pads 552/610/612 remain unchanged. Pad 24's first verse is reclassified without changing words.
- Browser checks confirmed the marker location, removed size controls, non-selectable text, full-pad image generation and the embedded-font PNG appearance with footer. The review interface and saved comments were not changed.

This remains a debug APK for phone testing. Physical-device pinch, swipe, clipboard and native share-sheet behavior have not been exercised here; no iOS build or store-signed release is claimed. Share destinations use reserved placeholder links until real app and reader URLs are available.
