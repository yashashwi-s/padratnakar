# महाभाव-कल्लोलिनी

## State

Integrated assistant-proofread transcription: 116 numbered pads and the separate closing आरती. Raw OCR remains evidence, never the production text. Assistant source checking is not a claim of independent human verification. The user's approved Sanskrit correction is preserved verbatim.

The supplied PDF has 84 image-only pages. Its contents identifies 116 numbered pads in seven sections, followed by a separate eighth section, श्रीराधाकुमारीकी आरती (unnumbered). Physical PDF pages 13–78 correspond to printed pages 1–66. Front matter, contents, illustrations, appended prose (PDF 79–82), blank pages and publisher directory remain separate from the pad collection.

## Preserved evidence

- `source/booklet.pdf`, `source.json`: original PDF, SHA-256, page count and method.
- `sections.json`: section names, ranges and source contents pages, visually checked.
- `raw-ocr/`: unchanged Hindi+English automatic-layout candidates with TSV word coordinates/confidences.
- `hindi-ocr/`: unchanged Hindi-only automatic-layout candidates.
- `hindi-block-ocr/`: independent segmentation pass in Hindi, used to expose differences and missed lines.
- `pages.jsonl`: primary OCR lines for all 84 pages, including material outside the pad corpus.
- `candidates.json`: 116 numbered entries plus the final aarti, section membership and source positions; still unverified OCR.
- `extracted-text.md`: convenient text view of the candidates, not canonical transcription.
- `review-queue.json`: pass disagreements and low-confidence words. Other lines also need review; agreement is not proof.
- `comparison-references.json`: 57 possible parallels in accepted Pad Ratnakar. These are comparison aids only; this edition may differ. No text has been substituted from that book.
- `visual-transcriptions.json`: separately preserved direct visual transcriptions, currently the final aarti. These are assistant readings, not user approval.

OCR mistakes include श्याम/स्थाम, मधुर conjuncts, punctuation, and number markers. The automatic segmentation splits some aligned lines into columns; the candidate builder rejoins overlapping baselines without rewriting words. Original TSVs remain available to audit this. Section-heading zones and printed page-number rows are excluded from pad bodies but preserved in page records. Decorative fragments and other line-level classification still need review.

Pad IDs are established by the ordered source markers, including OCR-confused brackets/numbers. All 116 boundaries are present. The final आरती has its own identity; do not assume that a related आरती elsewhere in the contents is identical.

## Reproduce

Run `python3 data/collections/mahabhav-kallolini/ocr.py`, then the same command with `--hindi` and `--single-block`. Requires PyMuPDF and local Tesseract with hin/eng languages. It resumes completed page outputs. Temporary page images are outside Git in `/private/tmp/kallolini-pages`.

Then run `python3 data/collections/mahabhav-kallolini/build-candidates.py`. The build requires all passes and fails unless all 116 pad markers are found. Nothing invokes the existing corpus rebuild or modifies accepted reader text.

## Reader integration and validation

`proofread/pages-*.json` contains the visual transcription for PDF pages 13–78. Run `python3 data/collections/mahabhav-kallolini/build.py` to regenerate the 117-entry manifest, readable transcription and unresolved-reading/alignment reports. The builder requires all body pages, exact pad-marker coverage, nonempty entries and the protected human decision.

The app imports `collection.json` through `src/lib/kallolini.js`. Eight sections, search, collection-specific bookmarks and clean routes are supported. Fixed-line layout uses source OCR bounding boxes with deliberate margins and stanza spacing; it is not an exact font facsimile. Original page breaks are joined within a pad.

`tests/kallolini.test.mjs` covers coverage, section ranges, source line rendering, bookmark identity and preservation of the approved reading. Run `npm run check` for the complete application checks.
