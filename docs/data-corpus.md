# Pad Ratnakar data integration

The repository now includes all 1,565 pads from the corrected PDF font decoding. This is the working text accepted for display; `pdf-decoded-user-accepted` does **not** claim that a person proofread every line. Seventeen pads with completed reviews in the local review database are carried over as `human-verified`, preserving the reviewer's text, metadata, revision, and checksum. The committed review snapshot preserves those decisions.

Run `npm run data:rebuild` from the repository root to rebuild the accepted text, Shodash display data, compact layout assets and audits. The pipeline reads `data/source/Pad-Ratnakar-Hindi.pdf`, `data/source/decoded-candidates.jsonl` `data/source/catalog.json` (accepted classifications and heading roles), and `data/source/reviewed-overrides.json`. The build is deterministic and never discovers a private review database implicitly. To import later human corrections, deliberately update the committed review snapshot before rebuilding.

Install the optional rebuild dependencies in a virtual environment with `python3 -m venv .venv`, activate it, then `python3 -m pip install -r requirements.txt`. Frontend development and JSON validation do not require PyMuPDF. `src/data/index_map.json` is the topic hierarchy used by navigation; do not resurrect the obsolete OCR/retag scripts.

Each hymn retains its existing identity and classification fields and now has decoded `verses`, `stanzas`, `headings`, `footnotes`, `source`, and `textStatus`. A footnote has its printed marker, decoded lines, physical PDF page numbers, and line boxes with raw font text. Each pad also has `footnoteRefs`; each reference gives the single owning pad and zero-based note index, so a shared note can appear on every pad it names without duplicating the note text. The source region and decoded checksum remain attached to every pad. Stanzas are grouped at printed double-danda endings; the ordered `verses` list remains the primary line sequence.

The note audit scanned physical pages 34–948 for the distinct 12-point small-print layer. It extracted 32 entries across 78 source lines; the final font-size audit added a 13-point explanatory line for pad 104, bringing the total to **33 notes across 79 lines**. These include asterisk notes, numbered explanatory notes, the note that continues from physical page 915 to 917, the Shodash Geet Pushpika note on page 918, and the final note on page 946. The two runs of numbered notes on pages 679–680 both belong to pad 1025: their printed verse markers restart at 1 on page 680. The page 938 notes follow pads 1544 and 1545 respectively. Several bottom-of-page notes sit after the next pad has begun; they are attached to the pad whose printed asterisk or numbered reference they explain (for example, the note on page 940 belongs to pad 1547). The page 218 note says “यह पद एवं पद संख्या ३४९”; it is placed after pad 333 begins and is shared with pad 349. The decoded verse has no surviving asterisk, so its `locationConfidence` records this contextual assignment and `docs/data-footnote-audit.json` identifies the ambiguity. The page 943 wedding blessing note applies to pads 1551–1556 and is attached to pad 1556 with `targetPadIds`. The page 946 note applies to pads 1560–1562 and is attached to pad 1562 with `targetPadIds`. Each named pad has a `footnoteRefs` pointer to its shared note.

The 12-point Gita citations on pages 652–662 and source attributions on pages 923 and 925 are inline material, so they remain in the pad text. The long page 915–917 note contains quoted verse and is kept in the footnote rather than merged into pads 1504–1505. These classifications are based on font size, marker, page position, and printed continuity. `docs/data-footnote-audit.json` records every extracted entry and any unmatched source line; the current unmatched count is zero. The note text has not separately undergone human proofreading.

`src/data/shodash-geet.json` is an isolated reading manifest: invocation, book title, opening pad 1, numbered songs 1–16 alternating pads 550/608 through 557/615, and closing pad 1508 with its dedication. It does not replace or reclassify the baseline pads.

## Shodash Geet display rules

The manifest's `rendering.numberStanzas` adds Devanagari stanza numbers to the end of each displayed stanza for this collection only, replacing the final bare `॥` with `॥१॥`, `॥२॥`, and so on. No canonical pad verse is changed. The opening and closing printed images omit the generic `(दोहा)` label, so `suppressMusicalHeadingForRoles` hides that label for those two collection entries only. Song entries keep their printed rāg/tāl headings.

The closing पुष्पिका also omits the final footnote asterisk in this collection's display. Canonical pad 1508 retains the printed asterisk and its footnote.

The supplied image for song 2 (pad 608) shows `हौं तो दासी नित्य तिहारी।` as its first verse line. The canonical pad now classifies the decoded words, without the danda, as its first verse line. The manifest adds the image-backed danda to that line in षोडशगीत only, without duplicating the line. The other 15 songs use their baseline first verse and heading as decoded; no unseen variant text is supplied.

## Source corrections and limitations

The final position audit removed phantom/duplicated headings from pads 982, 984 and 985, restored the visible comma in pad 984’s Gita citation, and moved the numbered meanings printed beneath pad 105 to the footnotes of pad 104, where the raised markers appear. Each change has a physical-page reference and reason in `data-footnote-audit.json`. The candidate snapshot is unchanged, so the before/after remains reproducible.

Pad 175’s line beginning “मधुर-सुमधुर” is classified as the first verse line after its rāg/tāl heading. The source catalog previously marked it as a heading; the accepted words and PDF position remain unchanged.

The opening text lines of pads 38, 242, 268, 282, 608, 710, 719, 735, 796, 1069, 1197 and 1358 are also classified as first verse lines rather than standalone headings. Their wording and source positions remain unchanged; musical/form headings stay in place.

The contextual association of the page 218 note with pads 333 and 349 remains explicitly labelled as inferred; it is not an outstanding line-position failure. Do not present acceptance of PDF decoding as independent verification of every spelling.

The rebuild reads a fixed metadata catalog rather than its own previous output. This prevents heading/title classification from changing on successive builds, including the unclosed musical heading in pad 1464. Its printed wording is retained as a heading; no closing character is invented.

## September 24 reader corrections

Pad 24's opening line is now a verse, not a heading; its accepted words and source geometry are unchanged. Shodash songs 5 and 6 have explicit four-couplet grouping in the manifest (song 5 follows the supplied scan; song 6 follows the user's collection-format correction). Collection numbering replaces terminal punctuation where required without changing canonical pads 552 or 610. Song 10 strips repeated display asterisks and retains one after the third numbered couplet, immediately after भगवान॥३॥, as requested; canonical pad 612 and the attached footnote remain unchanged. These display exceptions are reproducible through the collection builder.

Song 13 now follows the supplied scan’s four two-line couplets. Its first line gets a collection-only single danda instead of a stanza-ending double danda; canonical pad 556 remains unchanged. Pushpika has a 60-source-unit gap after its title and before the final dedication.
