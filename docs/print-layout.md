# PDF spacing and layout

All **21,672 canonical heading/verse lines across 1,565 pads** are associated with their printed positions. There are **zero unmatched or ambiguous line associations**. This checks alignment to the accepted text; it does not claim every word has been independently proofread.

## What happened to the 109 outstanding associations?

The original matcher required each line to occur exactly once. Eighty-eight references were repeated text, resolved by pairing equal numbers of source and canonical occurrences in reading order. Most of the other 21 references involved raised footnote numbers, raised leader dots, or page-crop boundaries. These now retain their original fragment baselines while belonging to the surrounding text line.

Direct PDF inspection also confirmed three phantom/duplicated headings around pads 982–985, a missing comma in pad 984's citation, and the pad 104 explanatory note printed below pad 105. These small source-backed corrections are recorded in `data-footnote-audit.json`. No OCR comparison was used as a benchmark.

## Runtime contract

Call `getPrintLayout(padId)` from `src/lib/print-layout.js`. It fetches and caches one of 16 static JSON chunks under `public/data/layout/`, with 100 pads per chunk except the last. These are local assets in the native app. A failed request can be retried. The UI should fall back to a simple fixed-line page if a layout file cannot load.

Each pad contains:

- `canonicalTextSha256`: checksum of the heading and verse arrays used for alignment;
- `pages`: physical, one-based PDF page numbers, width and height;
- `lines`: bounding box, baseline and `textReferences` (`heading`/`verse`, zero-based index);
- `segments`: printed text fragments, their bounding boxes, font sizes and individual baselines;
- `segmentTextAligned`: whether separately decoding the fragments reproduces the whole canonical line, ignoring whitespace;
- `footnotes`: note index, physical pages and source boxes; `footnoteRefs` resolves shared notes.

Coordinates are PDF points, measured from the **top-left** of the physical page. A box is `[left, top, right, bottom]`. `baseline` is the original vertical text baseline. A heading/verse reference is the authoritative connection to `src/data/hymns.json`.

When `segmentTextAligned` is false, segment text is `null`: do not guess a word-to-position mapping. The complete canonical line and its bounding box remain available. This can occur when legacy font shaping spans a fragment boundary. It is not an unresolved whole-line association.

## Reader implementation

The reader now uses a fixed, source-positioned Unicode page in `src/lib/fixed-print.js` and `src/components/PadTypography.jsx`. This replaces the earlier wrapping and justification approach at the user's request. The former fit-line hook has been removed.

Canonical headings and verses retain their printed horizontal positions and baseline gaps. Safe text groups use their individual source boxes; unaligned fragments use the complete accepted line. SVG text lengths fit those groups into the measured boxes without inserting spaces into the corpus. Every canonical verse remains one displayed line. Source page continuations join using the median printed line leading, without book page headers. There are no invented stanza margins in canonical pads. Shodash retains its separate heading, numbering, stanza-spacing and dedication treatment.

The page includes an additional 12 source units of white margin on each side. It fits the available viewport up to a 560 CSS-pixel reading width. The smaller/larger text controls scale the fixed page between 80% and 100% of that fit size. The enlargement cap prevents reflow; separate 100–300% zoom controls enlarge the whole page. Horizontal scrolling stays inside the white reading surface, and pad-swipe navigation is disabled while zoomed. The percentage control resets to fit. Browser pinch zoom remains enabled.

Headings, verses, raised note markers and footnotes are selectable SVG text, not page screenshots. Footnote positions and relative sizes come from the source spans. If source geometry cannot load, accepted text remains visible in a simple fixed-line fallback.

The font is still the licensed Unicode Noto Serif Devanagari, not the PDF's legacy ChanakyaBold subsets. Source widths and vertical geometry are followed, but the glyph outlines are not identical to the PDF. This is not a claim of an exact font match or a facsimile. Enlarging text changes the complete page scale rather than line breaking; this is the user's requested tradeoff for preserving the book layout.

Validation covers every canonical verse, footnote text and finite ordered baseline across all 1,565 pads, plus all 18 Shodash entries. Browser checks covered widths 320–1440, source-positioned groups, raised notes and whole-page zoom. The review tool and its saved comments were not changed.

## Rebuilding and provenance

`npm run data:rebuild` generates text, collection data, compact layout chunks and audits from committed sources. Only Python's PyMuPDF and Node are needed; no OCR service, account or API key is used.

For font-decoder research, `python3 scripts/corpus/extract_print_layout.py --raw-output /path/outside/repo` additionally saves raw character origins, bounding boxes and font names. These bulky intermediate records are intentionally absent from version control. The PDF and decoder inputs are retained, so they can be reproduced.

`data/shodash-geet-layout.json` contains the 18-entry collection's display-only headings, speaker alternation, stanza numbers and dedication style role. Its coordinates reference the original Pad Ratnakar, not invented coordinates for the supplied Shodash scans. See [the frontend handoff](frontend-handoff.md).

Hindi opening quotation marks are normalized for display (`\'राधा’` becomes `‘राधा’`). Canonical source strings, search data, and provenance remain unchanged. The visible line and its hidden measurement copy use the same display treatment.
