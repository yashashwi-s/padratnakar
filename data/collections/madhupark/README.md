# मधुपर्क

55 numbered pads from the user-supplied `Madhupark.pdf` (39 scanned pages,
printed pages 370–409; the supplied scan omits printed page 402 within the
explanation following pad 43). Only verse blocks are included. Introduction,
Hindi explanations, running headers and footers are excluded.

`transcription.txt` is the assistant's visually checked transcription of every
pad; it is not yet human-proofread. Original Braj vocabulary and printed line
endings are retained. Whitespace and danda punctuation are normalized. Blank
lines separate verse units. No modern-Hindi paraphrase is substituted.

`source-map.json` retains bounding regions from the scan,
including continuations across pages. Coordinates in `bbox` are PDF points;
they are locators, not exact glyph positions: curved pages can merge/split OCR rows.
Reviewed `lineCount` identifies how many transcribed lines belong to each source
region. These regions may include nearby headings/prose at their edges; only the
reviewed transcription is displayed or searched. In particular, pad 29's opening
line was missed by OCR and restored from the page image.

Rebuild deterministically, without OCR tools or network:

```sh
python3 data/collections/madhupark/build.py
```

`collection.json` contains 371 verse lines and the source checksum. The reader
uses the common fixed-page builder (288-unit page, common font and border scale,
one fitted body size per pad); it does not stretch scan images or ship the PDF
inside the application. The supplied PDF and raw OCR candidates remain local in ignored `source/`;
they are not published. The source checksum is retained, and local rebuilds
verify it when the PDF is present. The reviewed transcription and source map
are sufficient to reproduce collection.json on a clean checkout.
