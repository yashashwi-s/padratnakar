# PDF spacing and layout

All **21,671 canonical heading/verse lines across 1,565 pads** are associated with their printed positions. There are **zero unmatched or ambiguous line associations**. This checks alignment to the accepted text; it does not claim every word has been independently proofread.

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

Canonical headings and verses retain their printed horizontal positions and horizontal alignment. Safe text groups use their individual source boxes; unaligned fragments use the complete accepted line. The Unicode renderer batches measurements after the font loads and caches natural widths across visits. It chooses one proportional body size for the whole pad from complete line widths, never shrinking individual words to fragment boxes. Fragment gaps absorb surplus space, and near-full unfragmented lines use word spacing; it never stretches or squeezes glyph width with SVG textLength. Short opening lines keep their short printed extent. This avoids distorted first lines during fallback-to-source updates and preserves letter proportions without inserting spaces into the corpus. Every canonical verse remains one displayed line. Source page continuations join using the median printed line leading, without book page headers. Canonical verses add 3 source units of line spacing and 8 between the stored stanzas. This includes the three-line opening stanza of pad 54. Shodash retains its separate heading, numbering, stanza-spacing and dedication treatment.

The page includes a 26-source-unit decorative band and clear inner margins outside its text geometry and fits the available viewport up to a 560 CSS-pixel reading width. There are no text-size or percentage zoom controls. The HTML surface uses paint containment and a persistent 3D transform between gestures. Native share prewarming waits for 1.2 seconds of quiet and yields again before rasterization if a pinch has begun. A two-finger gesture scales only the inner page from 1× to 3× without reflow; the app buttons remain fixed. One-finger panning works diagonally while enlarged: the hook drives horizontal reader scrolling and vertical document scrolling together once per frame, avoiding nested-scroll axis locking. Lifting one finger after pinching continues directly into panning. Swipe-to-next is disabled during enlargement and multi-touch, while navigation buttons always work. A vertical gesture cancels that swipe attempt; horizontal swipes work from any scroll position. Short deliberate flicks use a 28-pixel threshold (40 pixels for slower swipes). Physical-device gesture feel still needs phone verification.

The last heading and first verse use a consistent 60-source-unit baseline gap in both collections. Within canonical verses, original PDF baseline spacing receives the line and stanza additions above.

Headings, verses, raised note markers and footnotes remain Unicode SVG text. Selection and the touch callout are disabled; holding still for 550 ms copies the complete displayed pad. Moving more than 8 pixels cancels copying. Footnote positions and relative sizes come from the source spans. If source geometry cannot load, accepted text remains visible in a simple fixed-line fallback.

The font is still the licensed Unicode Noto Serif Devanagari, not the PDF's legacy ChanakyaBold subsets. Source widths and vertical geometry are followed, but the glyph outlines are not identical to the PDF. This is not a claim of an exact font match or a facsimile. Enlarging text changes the inner page scale rather than line breaking; this is the user's requested tradeoff for preserving the book layout.

Validation covers every canonical verse, footnote text and finite ordered baseline across all 1,565 pads, plus all 18 Shodash entries. Browser checks covered widths 320–1440, source-positioned groups, raised notes and whole-page zoom. The review tool and its saved comments were not changed.

## Rebuilding and provenance

`npm run data:rebuild` generates text, collection data, compact layout chunks and audits from committed sources. Only Python's PyMuPDF and Node are needed; no OCR service, account or API key is used.

For font-decoder research, `python3 scripts/corpus/extract_print_layout.py --raw-output /path/outside/repo` additionally saves raw character origins, bounding boxes and font names. These bulky intermediate records are intentionally absent from version control. The PDF and decoder inputs are retained, so they can be reproduced.

`data/shodash-geet-layout.json` contains the 18-entry collection's display-only headings, speaker alternation, stanza numbers and dedication style role. Its coordinates reference the original Pad Ratnakar, not invented coordinates for the supplied Shodash scans. See [the frontend handoff](frontend-handoff.md).

Hindi opening quotation marks are normalized for display (`\'राधा’` becomes `‘राधा’`). Canonical source strings, search data, and provenance remain unchanged. The visible line and its hidden measurement copy use the same display treatment.

## Mahabhav Kallolini scan geometry

All 117 entries use one coordinate scale per pad, retained over page continuations. Source line top offsets determine vertical spacing with minimum Unicode glyph clearance and the canonical reader’s added breathing room. Musical headings have a 100-unit gap before the body at this collection’s 480-unit page width, equivalent to the canonical reader’s 60 at width 288. Line extents and indentation constrain the shared fitter; one uniform body size, seeded from the common reader body size (15 units at width 288), fits the most constrained complete line. Word spacing fills the recorded extent without glyph distortion. Five reviewed Kallolini 8 text boxes exclude adjacent illustrations. Three source-checked transcription corrections are recorded in its source-corrections.json. The scan and initial proofreading evidence remain preserved.

Kallolini 8 includes eight drawings extracted from source PDF pages 16–18. At the user’s request, Kallolini 8 now uses straight, naturally spaced lines within each stanza; complete stanza-and-image pairs alternate left/right. Both illustrated pages reserve 190 of 288 content units for text, start at a 16-unit font size, and use proportional 62-unit illustration slots. At the user’s explicit request, Pad Ratnakar 48 now alternates its artwork left/right using display-only phrase breaks at checked word boundaries for the first 32 canonical lines. Its own words and punctuation remain intact, and every displayed half retains the original source association. It does not borrow Kallolini’s different wording. Both use identical complete PNGs, fitted proportionally inside their illustration slots. Their source-image checksums and placement form the artwork revision used to refresh prepared share images. Drawings are embedded in export and loaded from a separate local asset chunk only on these pages.

All page models normalize to a 288-unit content width before receiving the 26-unit frame and shared outer margins. Thus border motifs have identical screen scale across collections. Newer collections start from the canonical 15-unit body and 13-unit heading sizes; complete-line fitting remains uniform across each pad.

RKK uses a fixed stanza builder with centered stanza blocks and modest alternating continuation-line indentation for one continuous Hindi hymn, 19 translated stanzas and 116 original line endings. Every stanza has a physical source page; no precise word geometry is invented for that scan.
