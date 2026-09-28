# श्री भाईजी जयन्ती महोत्सव के पद

The reader contains 15 numbered pads and three unnumbered closing pieces, in source order. `/jayanti/1` through `/jayanti/18` identify their reader positions; 16–18 are not invented printed numbers. आरती, “वे ही शतदल-चरण हमारे हृदय पटल पर रहें जड़े”, and जयगान have collection-menu shortcuts to entries 16–18. Search indexes each entry once, and bookmarks use the shared entry identity.

## Text and provenance

All 18 scanned pages were rendered and visually inspected. The PDF has no embedded text/font layer. `raw-ocr/` preserves untouched Hindi OCR candidates; `transcription.md` is the subsequent visual transcription. This is not the legacy-font decoding used for Pad Ratnakar, or a claim that the user proofread every line.

The user resolved all eight flagged readings on September 27, 2026. `corrections.json` preserves explicit replacements and confirmed unchanged readings, including the separately confirmed बखन्नाथ. `uncertainties.json` is now empty. Original source and raw OCR remain unchanged.

`collection.json` contains text blocks, printed numbers and per-line physical-page provenance. Rebuild with `python3 data/collections/bhaiji-jayanti/build-draft.py`; this does not rebuild or alter Pad Ratnakar/Shodash data.

Page continuations: entries 6 (pp.5–6), 7 (pp.7–8), 8 (pp.9–11), 11 (pp.13–14). The parenthetical “बाबा संग हनुमान” remains in entry 11. “भजन” appears above entry 10. जयगान keeps repeated lines and its three groups. Repeated श्रीहरिः is invocation metadata; no footnotes were identified.

## Display

`src/lib/jayanti.js` adapts these entries to search and the existing fixed-page reader. It preserves every line and block, uses a consistent font size fitted to the longest line in each entry, and retains natural widths for shorter lines. Pinch zoom, copy, sharing and navigation reuse the reader controls. These are Unicode reading layouts, not measured facsimiles of scanned positions. Canonical Pad Ratnakar and Shodash rules remain separate.
