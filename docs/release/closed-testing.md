# Closed testing: owner runbook

For a new personal account, arrange at least 12 testers who remain opted in continuously for 14 days before applying for production access. Recruit 15–20 if possible to allow for dropouts. They must actually test and give useful feedback; do not manufacture activity or feedback. Current requirement: https://support.google.com/googleplay/android-developer/answer/14151465

1. Complete account and Android-device verification using the owner account. The device verification requires the Play Console mobile app: https://support.google.com/googleplay/android-developer/answer/14316361
2. Create the app and a closed-testing track. Upload the signed AAB with the intended signing setup. Finish the Console-required listing/content steps and submit the test release.
3. Add consenting testers through the Console email list or Google Group. Keep personal tester addresses outside the public repository.
4. After the release is available, copy the actual opt-in URL from Console. Send it with the invitation below. An externally installed APK is not a substitute for joining the Play closed test.
5. Record opt-in dates and real feedback privately. Keep at least 12 continuously opted in for the required period. Do not promise a fixed production launch date.
6. Fix meaningful defects, upload with a higher version code when needed, and ask testers to update and verify fixes.
7. When eligible, apply for production access. Answer questions about recruitment, engagement, feedback and changes using actual evidence. Approval is not automatic after day 14.

## Invitation template — owner sends

I’m testing पद रत्नाकर, an offline reader with four Hindi devotional collections. Please join using [PLAY OPT-IN LINK], install from Google Play using the same Google account, and remain opted in for at least 14 consecutive days. Please use it naturally and send me any problems, including the collection/pad number and your phone model. Participation is voluntary. Thank you.

## Short test tasks

- First launch; close/reopen; airplane-mode launch and reading.
- All four collections, first/last pads, sections, Jayanti shortcuts.
- Search `राम`, `ram`, `radha प्रेम`, `10`, and a phrase in quotes. Verify Shodash 10 opens correctly.
- Save bookmarks, restart, confirm persistence.
- Rapid swipes, vertical scroll, pinch/pan, previous/next while zoomed.
- Back opens Exit app?; Cancel returns to reading without a black rectangle; Exit closes.
- Long press copies; sharing opens the receiving-app chooser with one image and caption.
- Large device font size, portrait/landscape, a long pad with notes.

## Evidence sheet (private)

For each tester: opt-in date, device/Android version, app version, tasks attempted, feedback/date, defect status. Do not invent completion or use a screenshot of twelve emails as proof of real testing. Keep feedback free of unnecessary personal information.
