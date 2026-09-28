# Repository structure and cleanup policy

The application is an offline reader; local corpus maintenance and review tools are separate from its runtime. No production backend or API credentials are required.

| Location                              | Purpose                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/`                     | Shared reader controls and fixed-page renderer                               |
| `src/lib/`                            | Collection adapters/registry, routing, search worker, gestures, sharing      |
| `src/data/`                           | Accepted canonical corpus and source manifest                                |
| `public/`                             | Bundled font/logo/icons and lazy geometry chunks                             |
| `data/source/`                        | Canonical PDF decoding inputs and human review provenance                    |
| `data/collections/`                   | Independent edition sources, proofreading and deterministic builders         |
| `scripts/corpus/`                     | Maintained canonical rebuild pipeline and isolated converter dependency      |
| `scripts/release/`                    | Signing workflow using private material outside Git                          |
| `scripts/benchmarks/`                 | Reproducible offline performance measurements                                |
| `tools/review/`, `tools/text-review/` | Local formatting and curated transcription review tools                      |
| `tests/`                              | Production API, source contracts, rendering, search and documentation checks |
| `docs/`                               | Maintained guides plus explicitly historical audit records                   |
| `android/`, `ios/`                    | Native shells; generated builds/web copies are ignored                       |

## September 28 maintenance

- Removed 100 CSS rules for obsolete search drawers, text-size controls, old poem markup and superseded navigation. Kept shared styles used by the current app.
- Removed unused download-link constants and replaced copied routing implementations in tests with imports of the real production functions.
- Consolidated independent-collection routing, maps, rendering and menu shortcuts behind the registry. Extracted the ordinary stanza page builder for reuse.
- Replaced contradictory handoff/release prose with maintained guides. Historical audit files remain explicitly labelled through the documentation index.
- Added a README line-limit test. Agents must review/update the README after major changes and keep it strictly below 200 lines.

No source corpus/proofreading files were discarded. The audit found the remaining collection scripts and OCR candidates are referenced rebuild/review inputs, not disposable runtime clutter. Keeping provenance protects accepted readings and makes future corrections traceable. Old generated app/native output is ignored and rebuilt for release; it is not a source of truth.

Before future deletion, check imports, tests, source builders and review workflows. Preserve user comments, review databases, accepted overrides and raw source evidence. Never commit `.env`, signing credentials, SDK paths, caches, local review answers or release binaries.
