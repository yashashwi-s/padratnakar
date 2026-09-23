# Frontend handoff

## Current state

Pad Ratnakar is an offline static React application. All runtime reading data is bundled as JSON or served as static assets; no production API, account system, or database is required.

The data layer covers 1,565 canonical pads, 33 source notes, 17 user-verified pads, and the 18-entry _Shodash Geet_ collection. Corpus provenance and recovery details are documented in [data-corpus.md](data-corpus.md). The source layout model and its limits are documented in [print-layout.md](print-layout.md).

The inner pad reading surface is implemented in `src/components/PadTypography.jsx` and `src/components/reader-typography.css`. It applies the source-backed hierarchy and geometry to headings, verses, grouped lines, citations, stanza gaps, and footnotes while preserving fixed source line endings with fit-to-width and inner-page pinch zoom. The surrounding navigation and application interface now have a revised design; the responsive reader audit is recorded in [reader-audit.md](reader-audit.md). Native Capacitor projects are present. Android debug compilation is verified; physical-device behavior and store release builds still need testing. Neither platform is release signed.

## Runtime data

Use the public functions in `src/lib` rather than importing generated corpus files throughout components.

### Canonical corpus

`getPad(id)` returns a canonical pad with its metadata, headings, verses, stanzas, source provenance, and text status.

`getFootnotes(id)` resolves note references to the single canonical note record. This matters for notes shared across ranges such as pads 269–271, 1551–1556, and 1560–1562. Render the returned notes; do not assume the note text is physically stored on the current pad.

`getShodashItem(selector)` returns a materialized collection entry. Supported selectors distinguish song number from pad ID:

```js
getShodashItem({ number: 2 });
getShodashItem({ padId: 608 });
getShodashItem("opening");
getShodashItem("closing");
```

The materialized collection already applies its display-only stanza numbering, its opening and closing heading rules, and the source-backed first line for song 2. Do not apply those transformations again in components.

### Print layout

`getPrintLayout(id)` loads layout metadata only when a reader needs it. Runtime chunks live at `public/data/layout/1.json` through `public/data/layout/16.json`, with about 100 pads per chunk.

Layout records preserve printed line relationships such as grouping, indentation, and alignment evidence. Treat them as semantic hints. PDF coordinates and extracted whitespace should not be copied directly into CSS or rendered as literal spaces. The current user-approved direction preserves every printed line at narrow widths by scaling the fixed page, with whole-page zoom for enlargement. Do not restore line wrapping.

`PadTypography` loads this metadata asynchronously and falls back to a simple fixed-line page when it is unavailable. `typographyModel` in `src/lib/typography.js` maps accepted Unicode lines to their source rows. At widths that can support the relationship, the reader retains measured indentation, centering, and separated text groups. Narrow containers fit the complete fixed page; inner-page pinch zoom enlarges the geometry without wrapping. See the current implementation in `src/lib/fixed-print.js`. Independently decoded segment text is never substituted for the accepted corpus.

This treatment is source informed rather than a facsimile. The bundled Unicode font has different metrics from the PDF's legacy subsets, and the responsive page intentionally does not reproduce fixed PDF page boundaries.

## Reader design constraints

The reading view should feel like a quiet printed book:

- white and black primary reader surface;
- restrained paper-colored space around the reader;
- the supplied Pad Ratnakar logo used with clear spacing;
- Devanagari typography optimized for sustained reading;
- headings, verses, stanza breaks, and footnotes with an obvious hierarchy;
- layouts that work from small phones through desktop widths.

Avoid dark presentation, gradients, glass effects, and ornamental motion. Preserve the text as the dominant element. These constraints are implemented for the inner reading surface and continue to guide the future redesign of the surrounding application.

## Main frontend work

The inner poem typography is complete as a design foundation. Further frontend and device QA should concentrate on:

1. Clear navigation among pad number, search results, sections, and _Shodash Geet_.
2. A coherent menu, search, bookmarks, controls, and paper-colored surround around the white reader.
3. Accessible focus, keyboard, screen-reader, font scaling, and touch behavior across the complete interface.
4. Useful loading and failure feedback while retaining the typography component's fixed-line fallback.
5. Device QA for safe areas, back navigation, links, offline behavior, and the full supported font-size range.

Keep speculative features out of the first redesign. Additional ideas are tracked in [future-suggestions.md](future-suggestions.md).

## Development and verification

Install and run locally:

```sh
npm ci
npm run dev
```

Run the full check after changes:

```sh
npm run check
```

The check should cover linting, JavaScript tests, corpus data tests, and the production build. Data-only checks are also available through `npm run test:data`.

To rebuild generated corpus artifacts, install PyMuPDF for the active Python 3 environment and run:

```sh
npm run data:rebuild
```

To update native projects after a verified web build:

```sh
npm run native:sync
```

A successful browser build does not establish native release readiness. Before release, test both platforms on physical devices, verify offline assets and fonts, configure signing, and complete platform-specific packaging and store checks.

## Original handoff baseline (before the fixed-page change)

The handoff passed lint, 20 JavaScript behavior tests, all-corpus JSON checks, all 21,672 heading/verse position checks, and the Vite production build. Runtime dependency audit reports zero advisories. The Capacitor CLI development dependency chain still reports three moderate advisories; avoid forced downgrades as a substitute for a tested tooling update. The build also warns about the eagerly imported full corpus size; loading/splitting this for the final frontend is a performance task, not missing content.

Browser checks covered the opening pad, Shodash song 2, and pad 1504’s continued footnote. At a 390px viewport, the maximum 176% reader size had no horizontally clipped verse lines or document overflow. Phone-width Shodash headings and numbering remained readable. These browser checks do not replace physical-device QA.

The current fixed-page implementation passes 29 JavaScript tests, 4 review-store/PDF tests, corpus validation, and the production build. Its layout checks cover all canonical verses and notes, all collection entries, and ordered source baselines. Browser checks confirmed unchanged line geometry from 320 to 1440px and horizontal page zoom without document overflow. The review UI and comment store were unchanged.

## September 24 touch and sharing update

The reading page pinches independently (1–3×); toolbar and bottom navigation do not scale. A horizontal flick works from any vertical scroll position at fit size. Enlargement reserves horizontal movement for panning; previous/next buttons still navigate. The earlier Noto Serif Devanagari 700 weight is restored. Long press copies the whole displayed pad without selection handles. Android stretch feedback is disabled in the WebView; CSS suppresses overscroll and tap highlights while retaining keyboard focus indicators.

Sharing exports the full positioned pad and footnotes to PNG with an embedded font and small footer. Capacitor Share/Filesystem handle mobile attachments, Clipboard handles copying. Desktop browsers download the PNG. `src/lib/share-pad.js` contains explicitly reserved placeholder app and reader links; replace them before release. A shared image contains the whole pad, not just the visible/zoomed portion. iOS has its file timestamp privacy declaration; its build and device gestures remain unverified.
