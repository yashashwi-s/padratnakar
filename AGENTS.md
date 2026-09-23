# Pad Ratnakar project

- Offline React/Vite reader; no production backend or API credentials.
- Corpus data and the inner pad typography are implemented. Keep inner-reader changes isolated from the surrounding application UI unless the user asks for that broader design pass.
- Use `npm ci`, `npm run dev`, and `npm run check` (lint, JS tests, full JSON data checks, production build).
- `npm run data:rebuild` needs Python with `requirements.txt` plus Node. It is deterministic and offline. Source inputs are in `data/source/`; entrypoint is `scripts/corpus/build.py`.
- Never use old OCR as a benchmark for the user-accepted PDF font decoding. Preserve human review overrides and provenance. Do not silently rewrite devotional text.
- Read `docs/data-corpus.md` and `docs/print-layout.md` before changing data. The layout test requires every canonical heading/verse line to have a source position.
- Keep Shodash Geet display rules separate from canonical pads. Use `src/lib/corpus.js`; resolve shared footnotes through `getFootnotes`.
- `src/lib/print-layout.js` lazily loads 16 geometry chunks. Do not insert repeated spaces into canonical text to simulate print alignment.
- `src/components/PadTypography.jsx` and `src/lib/fixed-print.js` render fixed source-positioned Unicode lines. The user explicitly replaced wrapping with fit-to-width (80–100%) and whole-page zoom (100–300%). Preserve printed line endings, source baseline gaps, margins and horizontal zoom panning. Do not describe Noto Serif Devanagari as an exact PDF font match or facsimile.
- White reading surface, black text, paper-colored surround, supplied logo; no dark mode or gradients. Preserve accessibility font scaling.
- Native directories are development shells, not signed/tested releases. `npm run native:sync` copies current web assets; it does not test native builds.
- Never read or commit `.env`, SDK machine paths, signing secrets, or external research archives. No credentials are needed here.
