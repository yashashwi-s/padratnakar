# पद-रत्नाकर

An offline reader for the Hindi devotional collection _Pad Ratnakar_. The application is a static React and Vite project: the corpus, book collections, search data, and print-layout metadata ship with the app, so production does not require a server or database.

The repository currently contains:

- all 1,565 pads from the accepted PDF font decoding;
- 17 pads with user-verified text and metadata;
- 33 source notes, including shared notes that resolve on every referenced pad;
- the 18-entry _Shodash Geet_ sequence: opening, 16 songs, and closing;
- source-backed headings, stanza structure, provenance, and physical PDF page references;
- print-layout metadata split into 16 lazy-loaded chunks of roughly 100 pads each.

Corpus recovery and validation are complete enough for application development. The inner pad reader now uses responsive source-informed typography: centered and indented lines, separated printed groups, stanza spacing, headings, citations, and footnotes retain their relationships on wider screens and reflow naturally on narrow screens or at larger accessibility sizes. The surrounding navigation and application interface remain the main frontend design work. The Android and iOS shells exist for development, but have not been fully tested or release signed. This repository should not be treated as release ready.

## Start development

Use a current Node.js installation and Python 3 with PyMuPDF when rebuilding corpus data.

```sh
npm ci
npm run dev
```

Run the complete repository check before handing off changes:

```sh
npm run check
```

This runs linting, JavaScript tests, corpus data checks, and the production build.

## Data APIs

Frontend code should read corpus data through the modules in [`src/lib`](src/lib):

- `getPad(id)` returns one canonical pad.
- `getFootnotes(id)` resolves both direct and shared source notes.
- `getShodashItem(selector)` returns a materialized _Shodash Geet_ entry.
- `getPrintLayout(id)` lazily loads the pad's print-layout chunk.

Use structured `verses`, `stanzas`, `headings`, and footnotes rather than parsing display text. Font coordinates describe relationships in the printed source; they are not literal spaces to reproduce in HTML.

The inner reading view is implemented by [`PadTypography`](src/components/PadTypography.jsx), with source-informed modeling in [`src/lib/typography.js`](src/lib/typography.js) and isolated styles in [`reader-typography.css`](src/components/reader-typography.css). It is a responsive Unicode reading treatment, not a claim of exact PDF font matching or page facsimile.

## Corpus maintenance

The source archive and review snapshots live under [`data/source`](data/source). Decoder support files live under [`scripts/corpus/vendor`](scripts/corpus/vendor). See [the corpus documentation](docs/data-corpus.md) and [print-layout notes](docs/print-layout.md) before changing generated data.

Rebuild the corpus with:

```sh
npm run data:rebuild
```

The rebuild uses local source files and Python with PyMuPDF. It does not require a production backend.

## Native shells

After a successful web build, synchronize the generated assets into the Capacitor projects:

```sh
npm run native:sync
```

The Android debug APK build is available for testing. See [the reader audit](docs/reader-audit.md) for the build command and verification limits. Physical-device QA, store signing, store metadata, and release packaging remain outstanding.

## Frontend direction

The implemented inner reader uses a white and black book surface and source-informed line relationships. Future work should refine the surrounding application with a restrained paper-colored surround and the supplied Pad Ratnakar logo. Avoid dark themes, gradients, and decorative interface effects that compete with the text. See [the frontend handoff](docs/frontend-handoff.md) for the current architecture, constraints, and remaining work. Ideas outside the current scope are recorded in [future suggestions](docs/future-suggestions.md).

## Review pad formatting

Run `npm run review` and open [the local review page](http://127.0.0.1:8766/review/). Compare the mobile reader with the source PDF, leave autosaved comments, and verify or flag pads in one step. See [the review guide](docs/format-review.md) for shortcuts and local storage.
