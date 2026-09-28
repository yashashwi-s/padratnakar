# Frontend handoff

Pad Ratnakar is a static, offline React/Vite reader. The production app bundles all corpus data, search documents, reader fonts, and source-layout metadata; it does not call a production API or use accounts.

## Reader architecture

`src/App.jsx` owns the application views, browser/native route handling, collection navigation, saved pads, search UI, sharing, and back behavior. Keep feature logic out of the generated data files.

`src/components/PadTypography.jsx` composes a reader page. `src/lib/fixed-print.js` renders the accepted Unicode text as fixed SVG rows, using source-informed positions. The page fits to its container and can pinch zoom and pan horizontally inside the reading surface. Printed line endings, spacing, indentation, and stanza relationships are part of the reader contract. Do not reflow verse lines or create alignment with repeated text spaces.

The reader is source informed, not a PDF-font match or facsimile. Noto Serif Devanagari provides readable Unicode text with different metrics from the source PDF font.

## Collections and routes

The app exposes four collections:

| Mode        | Collection                          | Entries |
| ----------- | ----------------------------------- | ------: |
| `pad`       | Pad Ratnakar                        |   1,565 |
| `shodash`   | Shodash Geet                        |      18 |
| `jayanti`   | Shri Bhaiji Jayanti Mahotsav ke Pad |      18 |
| `kallolini` | Mahabhav-Kallolini                  |     117 |

Canonical pads come from `src/data/hymns.json` through `src/lib/corpus.js`. Shodash Geet materializes collection-specific titles, stanzas, and display rules through `getShodashItem`; components must not repeat those transformations.

`src/lib/reader-collections.js` is the registry for the additional collections. A registry entry supplies its pads, fixed-page builder, sections, first entry ID, optional shortcuts, and an ID lookup. `src/lib/collection-routes.js` keeps collection route creation and validation as pure functions. Routes use `/mode/id` on the web and hash equivalents in native shells.

Use [the collection guide](adding-collections.md) when adding or changing a collection so its registry, route, search catalog, reader page, navigation, and tests stay aligned.

## Search

`src/lib/search-catalog.js` defines all searchable collections and transforms each one into text-only documents. `src/lib/use-search.js` starts the module worker on demand; `src/lib/search.worker.js` builds and queries indexes outside the React UI; `src/lib/search-service.js` holds the reusable service. Never send SVG geometry or page metrics to the worker.

Search results return IDs and match details. The UI reattaches the local reader records, groups results by collection, preserves each collection's numbering and routes, and can filter by collection. Keep initialization failures and retry behavior intact.

## Sharing and native behavior

`src/lib/share-pad.js` builds canonical links. On the web, sharing uses the displayed text plus that link. On Android and iOS, it exports the complete positioned SVG page as a PNG and attaches it with link text. A share image represents the entire pad, independent of the current zoom or viewport.

`npm run native:sync` builds web assets and copies them into Capacitor projects. It is not a native build or device test. Android 1.0.6 is a signed historical release; release preparation for 1.0.7 is documented under [release](release/README.md).

## Data and visual constraints

Read [data-corpus.md](data-corpus.md) and [print-layout.md](print-layout.md) before changing corpus or geometry data. Use `getFootnotes` so shared source notes resolve correctly. Do not use historical OCR to revise accepted text.

The reader surface stays white with black text, within a restrained paper-colored surround and the supplied logo. Avoid dark themes, gradients, and decorative motion. Preserve browser accessibility sizing, keyboard behavior, focus visibility, and screen-reader semantics.

## Verification

```sh
npm ci
npm run check
```

Run focused tests while working, then run the full check before handoff. Do not record fixed test totals in maintained documentation: the suite is expected to grow.
