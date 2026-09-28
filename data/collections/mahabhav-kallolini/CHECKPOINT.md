# Checkpoint — September 28, 2026

The reader now imports 116 numbered pads and the separate closing आरती across eight sections. All physical body pages 13–78 have assistant visual transcription records (1,586 source-checked content lines). Original scans and all raw OCR passes remain unchanged. Front matter and appended prose are not pads and are excluded from this collection.

## Review and provenance

Recovered incomplete drafts were filled against scans, followed by a visual correction pass. This is assistant proofreading, not independent human verification of every word. The one user-approved Sanskrit line is preserved verbatim with its decision ID. Automated coverage and alignment checks establish structural completeness, not textual infallibility. No unresolved readings are currently recorded.

`proofread/pages-*.json` is the maintained transcription source. `build.py` produces `collection.json`, `transcription.md`, and review reports. Rebuild with `python3 data/collections/mahabhav-kallolini/build.py`; do not run the unrelated corpus rebuild over the user's Shodash layout changes.

## Integration

`src/lib/kallolini.js` and `reader-collections.js` provide fixed-line rendering and distinct IDs. App navigation, section browsing, search and bookmarks support `/kallolini/1` through `/kallolini/117`; the final आरती does not display a fabricated printed number. Positions are aligned to OCR line boxes, not exact PDF font geometry. Existing reader pinch zoom, copy and native image sharing are reused.

## Delivery

Version 1.0.4 / Android code 6 passed npm check, browser navigation/layout checks, Android release build and signing verification. Signed APK/AAB are in the persistent artifact folder `play-release-1.0.4`; packaged web assets match the current build byte-for-byte. Preserve the user's existing `data/shodash-geet-layout.json` changes and `docs/swipe-lag-investigation.md`. No physical-device test has been performed on this version yet.
