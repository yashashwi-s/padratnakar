# Adding and maintaining collections

## One registry, separate source adapters

`src/lib/reader-collections.js` registers independent collections. The main Pad Ratnakar corpus and Shodash's shared-pad edition retain their explicit adapters: their source geometry and numbering are different contracts. Do not flatten them together or modify canonical pads to fit a special edition.

A registry entry supplies:

| Field                       | Contract                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| key                         | Stable lowercase URL-safe identifier, e.g. `jayanti`; never rename released keys without route migration.     |
| `title`                     | Public collection name.                                                                                       |
| `pads`                      | Ordered reading sequence with unique positive integer `id` values. Order is independent of printed numbering. |
| `firstId`                   | First entry's ID; derived from the sequence.                                                                  |
| `sections`                  | Array of `{id, name}`. Each pad uses `sectionId`; an empty array suppresses the section menu.                 |
| `page(pad, measuredWidths)` | Returns the fixed SVG page description described below.                                                       |
| `shortcuts`                 | Optional selected pad objects exposed as menu shortcuts; do not duplicate searchable records.                 |

`defineCollection` derives `padById` and `indexById` maps. App routes, collection menu, source-page builder selection, bookmarks, search, and next/previous navigation use this registry. Add one registry entry instead of adding collection-name conditionals to these features.

## Pad adapter contract

Keep authoritative data in `data/collections/<collection>/`. The source adapter in `src/lib/<collection>.js` converts it into pad objects:

- `id`: stable route ID; `collection`: registry key; `title`: identifying text.
- `verses`: flat display lines in order; `stanzas`: arrays grouping those same lines.
- `headings`: additional searchable headings (empty array when absent).
- `printedNumber`: edition-specific printed number, or `null` for an unnumbered invocation/closing piece. It is not necessarily the route ID.
- `sectionId` and `section`: section identifier and name when relevant.
- Optional `raag`, `taal`, `form`, and `footnotes: [{lines: [...]}]`.
- Keep source pages, source bounding boxes, review decisions, and uncertainty in the data. Do not substitute machine suggestions for accepted text without review.

The current independent collection section menu is flat. Pad Ratnakar retains its existing topic/subtopic adapter. A new edition needing deeper hierarchy should add and test a shared section-tree contract, not encode nesting in title strings or scatter branches through App.

## Fixed page contract

Ordinary stanza collections can reuse `src/lib/stanza-page.js`. Jayanti uses this builder. Supply `lines[].sourcePage` when available; absent source positions must not be fabricated. A specialised edition can provide its own pure builder, as Kallolini does.

A builder returns `{width, height, lines, decorations}`. Each line includes `text`, `y`, `fontSize`, `role`, and either `centered` or `x`; optional `length`, `wordSpacing`, and source metadata describe positioning. Decorations are plain rectangle geometry. Keep page dimensions finite and positive. The renderer owns actual font measurement, fitting, pinch/pan, copy and share; builders must not add UI controls or rewrite accepted text.

Do not simulate geometry by adding repeated spaces to canonical lines. Preserve printed line endings and intentional stanza separation. Search documents are automatically generated from the adapter, excluding heavy page geometry.

## Integration checklist

1. Preserve the source, accepted transcription, review overrides and provenance in the collection directory. Add its own README and deterministic builder if needed.
2. Add its source adapter and page builder; register the entry. Main/Shodash source recovery remains in `scripts/corpus/`; independent editions retain their own documented builders.
3. Add source/sequence tests: expected count, stable IDs, printed numbers, stanza completeness, footnotes, section membership, source-line coverage and any specialised headings/dedication.
4. Extend `tests/search-catalog.test.mjs`'s final-line coverage and the collection's numeric-search cases. Registry contract tests automatically include new entries.
5. Check direct clean/hash routes, menu-first-pad behavior, collection bookmarks, search snippets/filters, circular navigation and shares. Test a one-entry/two-entry collection if using that structure.
6. Visually inspect short/long pads on narrow and wide screens. Confirm section labels, no line wrapping and pinch controls independent of toolbar buttons.
7. Update README and maintained docs (README remains under 200 lines), then run `npm run check`. Sync/rebuild native assets for an APK; web checks alone are not native testing.

Review tools: `npm run review` is the pad-format reviewer; `tools/text-review/README.md` documents the curated transcription questions. Keep local review answers outside Git until intentionally reconciled into reviewed data.
