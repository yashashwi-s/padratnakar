# Pad Ratnakar project

- Offline React/Vite reader; no production backend or API credentials.
- The reader has four collections: Pad Ratnakar (1,565 pads), Shodash Geet (18 entries), Shri Bhaiji Jayanti Mahotsav ke Pad (18 pads), and Mahabhav-Kallolini (117 pads).
- Use `npm ci`, `npm run dev`, and `npm run check`. The full check covers linting, JavaScript tests, corpus and print-layout JSON checks, review checks, and the production build.
- `npm run data:rebuild` needs Python with `requirements.txt` plus Node. It is deterministic and offline. Source inputs are in `data/source/`; the entry point is `scripts/corpus/build.py`.
- Never use old OCR as a benchmark for the user-accepted PDF font decoding. Preserve human review overrides and provenance. Do not silently rewrite devotional text.
- Read `docs/data-corpus.md` and `docs/print-layout.md` before changing data. The layout test requires every canonical heading and verse line to have a source position.
- Keep Shodash Geet display rules separate from canonical pads. Use `src/lib/corpus.js` and resolve shared footnotes through `getFootnotes`.
- `src/lib/print-layout.js` lazily loads 16 geometry chunks. Do not insert repeated spaces into canonical text to simulate print alignment.
- `src/components/PadTypography.jsx` and `src/lib/fixed-print.js` render fixed source-positioned Unicode lines in an SVG page. Preserve printed line endings, source positions, intentional line/stanza breathing room, margins, fit-to-width, and inner-page pinch zoom with horizontal panning. Do not restore line wrapping, size controls, or percentage controls. Do not describe Noto Serif Devanagari as an exact PDF font match or facsimile.
- Keep collection metadata in `src/lib/reader-collections.js`; use `src/lib/collection-routes.js` for collection routing helpers and `src/lib/search-catalog.js` for worker-search documents. Follow `docs/adding-collections.md` when adding a collection.
- Web sharing sends text and a canonical link. Native sharing exports the full positioned page to PNG and includes the link as share text; preserve this distinction.
- White reading surface, black text, paper-colored surround, and supplied logo. No dark mode or gradients. Preserve accessibility font scaling.
- Native directories are platform shells; current Android release status and build steps are in `docs/release/README.md`. `npm run native:sync` copies current web assets and does not test native builds. Never read or commit signing secrets, SDK machine paths, `.env`, or external research archives.
- After a major product, architecture, data, or release change, review and update `README.md`; keep it under 200 lines.
