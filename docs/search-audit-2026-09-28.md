# Search audit and refinements — 28 September 2026

## Confirmed faults and fixes

- The old phonetic matcher removed vowels and searched substrings throughout a concatenated pad. `ram` returned 1,262 canonical pads, including unrelated words. Latin queries now use whole words for short input, common vowel spellings, longer word prefixes and a lower-ranked, explicitly labelled consonant-token fallback. Joined श्री honorifics remain searchable (`ram` finds श्रीराम without matching परम). This is a deliberately limited keyboard-spelling aid, not general translation or arbitrary typo correction.
- Mixed-script terms such as `radha प्रेम` previously failed. Each query term now independently matches Hindi or romanized source words. All terms remain required.
- Punctuation-only queries listed the whole corpus. They now return no matches.
- Shodash numeric search compared original Pad Ratnakar IDs instead of displayed song numbers. Each collection now supplies its own printed search number. Opening/closing pieces without a printed number are found by text. Result links retain their correct underlying route IDs.
- Shodash now indexes its actual displayed stanzas and headings, including its separate edition, rather than substituting canonical verses. Shared footnote text remains searchable.
- Exact phrase search was supported internally but not exposed. Quoted input now requests ordered phrase matching (including across printed verse-line breaks). It does not combine a title and unrelated metadata into an invented phrase.
- Search indexes were built at module evaluation, including a second full main-corpus index merely to filter Shodash afterward. Indexing now starts on first search in a dedicated worker, off the UI thread, once per page session. Queued input is coalesced and stale responses are ignored; failure exposes a retry action. No search requests leave the device.
- Search results had no concise count, announced their entire result tree to assistive technology, and rendered up to 60 rows per collection. Results now use one status announcement, per-collection counts, a collection selector, and independent batches of 20. Query/filter/revealed limits survive opening a result and returning while the app remains mounted.
- Results now show the actual matching line, up to three visible lines, instead of replacing matched headings/footnotes with unrelated opening text. When a heading or metadata matched, an opening verse provides identification. Approximate spellings and footnote hits are labelled. Collection-name matches open the first pad directly.
- Search has a labelled search input and page heading, a single 44-pixel clear button that restores input focus, and no duplicate browser clear icon. Pressing the header search button again preserves typed input. Search Back still returns to the reader, as requested by the user.

No canonical text, source geometry or collection ordering was edited.

## Validation

- Unit coverage includes Hindi/Arabic numbers, all-term and quoted queries, canonical Unicode equivalence, shaping controls, mixed scripts, common Latin spellings, strict short-word boundaries, Shri compounds, score order, snippets, shared notes, section names, collection numbering and punctuation-only input.
- Every pad in all four collections is checked for discoverability by its final verse line. The real worker is exercised for query delivery and reuse.
- Full lint, production build, JavaScript tests, corpus validation and review tests pass. The built service worker precaches the dedicated search worker; installed-PWA offline execution was not separately tested on a physical phone.
- Browser checks: direct focused search opening; Shodash 10 result navigates to `/shodash/10`; Back restores the query; changing a query preserves the collection filter; desktop and 390-pixel search layout checked. These do not constitute native keyboard, TalkBack or VoiceOver device testing.

## Reproducible timing

Run `node scripts/benchmarks/search.mjs`. One local Node run, all four collections:

| Query       | Warm median | Canonical results |
| ----------- | ----------: | ----------------: |
| प्रेम       |     3.06 ms |               610 |
| radha       |     8.48 ms |               605 |
| krishna     |     5.10 ms |               286 |
| ram         |     2.15 ms |               165 |
| dou chakor  |     1.25 ms |                 4 |
| radha प्रेम |     7.24 ms |               344 |
| १५०८        |     0.06 ms |                 1 |

Initial index creation took 419 ms in that run. In the app it runs in a worker on first search, not during reader startup. These figures measure the search service, not UI painting, worker startup, structured-clone overhead or phone end-to-end latency. Native device benchmarking remains useful.

## Research behind the choices

- [Unicode normalization FAQ](https://unicode.org/faq/normalization.html): canonical-equivalent sequences should compare equally. The existing search-only nukta tolerance remains a product choice beyond canonical equivalence; source text is untouched.
- [W3C search status example](https://www.w3.org/WAI/WCAG22/working-examples/aria-role-status-searchresults/): announce a concise result status rather than making an entire changing result list live.
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API): move CPU work off the main thread to keep UI interaction available.

Potential later enhancements: highlighted matching words, restoring the exact search scroll position after browser Back, and a curated Hindi spelling/alias dictionary. Do not reintroduce indiscriminate consonant-substring matching for more apparent recall.
