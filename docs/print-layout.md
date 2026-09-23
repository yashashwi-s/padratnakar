# PDF spacing and layout

All **21,672 canonical heading/verse lines across 1,565 pads** are associated with their printed positions. There are **zero unmatched or ambiguous line associations**. This checks alignment to the accepted text; it does not claim every word has been independently proofread.

## What happened to the 109 outstanding associations?

The original matcher required each line to occur exactly once. Eighty-eight references were repeated text, resolved by pairing equal numbers of source and canonical occurrences in reading order. Most of the other 21 references involved raised footnote numbers, raised leader dots, or page-crop boundaries. These now retain their original fragment baselines while belonging to the surrounding text line.

Direct PDF inspection also confirmed three phantom/duplicated headings around pads 982–985, a missing comma in pad 984's citation, and the pad 104 explanatory note printed below pad 105. These small source-backed corrections are recorded in `data-footnote-audit.json`. No OCR comparison was used as a benchmark.

## Runtime contract

Call `getPrintLayout(padId)` from `src/lib/print-layout.js`. It fetches and caches one of 16 static JSON chunks under `public/data/layout/`, with 100 pads per chunk except the last. These are local assets in the native app. A failed request can be retried. The UI should fall back to ordinary text flow if a layout file cannot load.

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

The inner reading view is implemented in `src/components/PadTypography.jsx`, `src/lib/typography.js`, and `src/components/reader-typography.css`. The clean spacing comes from measured positions and gaps, not a string of spaces. Canonical Unicode remains unchanged for search, copying, shaping, and accessibility.

The typography model uses whole-line positions to infer relative indentation and centering. Where aligned source fragments safely partition the accepted line, it can retain separated printed groups without substituting fragment text for the canonical string. Fragment boundaries inside a Devanagari word are joined so shaping is preserved. Citations, headings, stanza gaps, and footnotes have distinct roles.

At wider reading measures the component keeps source-supported indentation and grouping. The reader measures each rendered line with the current font. It uses source spacing only when the complete line fits and limits the extra space between groups. Lines that do not fit use the full reading width and natural wrapping; their last wrapped line is never forcibly justified. ResizeObserver updates these decisions when the available width or font metrics change. Short poems have a centered reading measure instead of stretching across a desktop. Layout loading is asynchronous; ordinary stanza flow remains available when a chunk cannot load. Do not shrink text to force an enlarged setting into the original width.

The PDF's embedded legacy-font subsets are not ordinary Unicode web fonts. The bundled Noto Serif Devanagari is an offline, licensed alternative, but its glyph metrics differ. This is a responsive, source-informed reading layout; it does not claim exact PDF typography or facsimile pages. Exact facsimile rendering uses the original PDF.

## Rebuilding and provenance

`npm run data:rebuild` generates text, collection data, compact layout chunks and audits from committed sources. Only Python's PyMuPDF and Node are needed; no OCR service, account or API key is used.

For font-decoder research, `python3 scripts/corpus/extract_print_layout.py --raw-output /path/outside/repo` additionally saves raw character origins, bounding boxes and font names. These bulky intermediate records are intentionally absent from version control. The PDF and decoder inputs are retained, so they can be reproduced.

`data/shodash-geet-layout.json` contains the 18-entry collection's display-only headings, speaker alternation, stanza numbers and dedication style role. Its coordinates reference the original Pad Ratnakar, not invented coordinates for the supplied Shodash scans. See [the frontend handoff](frontend-handoff.md).

Hindi opening quotation marks are normalized for display (`\'राधा’` becomes `‘राधा’`). Canonical source strings, search data, and provenance remain unchanged. The visible line and its hidden measurement copy use the same display treatment.
