# पद-रत्नाकर

Pad Ratnakar is an offline React/Vite reader for Hindi devotional literature. Reading data, search material, fonts, and source-layout metadata ship with the app; it has no production backend or account system.

## Collections

The reader contains five collections:

| Collection                                     |            Entries |
| ---------------------------------------------- | -----------------: |
| _Pad Ratnakar_                                 |         1,565 pads |
| _Shodash Geet_                                 |         18 entries |
| _Shri Bhaiji Jayanti Mahotsav ke Pad_          |            18 pads |
| _Mahabhav-Kallolini_                           |           117 pads |
| _Shri Radha Kripa Kataksh (Hindi translation)_ | 1 hymn, 19 stanzas |

Canonical pads retain accepted Unicode text, source provenance, headings, stanzas, and shared footnotes. _Shodash Geet_ has collection-specific display rules that remain separate from canonical pad data.

Pad Ratnakar navigation follows the reviewed contents: 19 main sections and 22 subsections, with visible pad ranges. The [October 10 section corrections](docs/section-corrections.md) document the reference scan, complete hierarchy, and changes to 517 pad classifications; devotional text and page geometry are unchanged.

## Develop and check

Use a current Node.js installation:

```sh
npm ci
npm run dev
npm run check
```

`npm run check` runs linting, the JavaScript suite, corpus and print-layout validation, review checks, and a production build.

Rebuild generated corpus data only when changing its source inputs:

```sh
npm run data:rebuild
```

The rebuild is deterministic and offline, and requires Python with the packages in `requirements.txt`. Read [the corpus guide](docs/data-corpus.md) and [print-layout guide](docs/print-layout.md) first.

## Reader and sharing

The inner reader renders source-positioned Unicode lines as an SVG page. It preserves printed line endings and source alignment, uses proportional glyph fitting and word spacing instead of horizontal letter distortion, fits the full page to the available width, and supports pinch zoom with horizontal panning inside the page. Do not reintroduce responsive line wrapping or pad canonical text with spaces to imitate PDF alignment.

The reading page uses 25 original Vrindavan-inspired SVG borders—flowers, climbing vines, birds, Sanjhi-inspired patterns and garlands—outside the text geometry. A balanced order gives each pad a stable design across visits; every block of 25 uses the full set. Repeated motifs reuse cached embedded image tiles, and a uniform clipped band keeps artwork clear of the text. It scrolls and zooms with the page and appears in native image shares; the white circular share/bookmark controls remain in sticky screen chrome and are screen-only. Short pages extend the frame to the footer without stretching verse spacing.

Pinch previews composite an HTML surface, with page dimensions and scroll anchoring settled at release. Fitted-size two-finger movement cannot displace the page, and enlarged panning stays within its bounds. Border motifs retain their original proportions and reuse cached complete tiles in a fixed order.

Body text uses one fitted size per pad, including fragmented source lines. Text measurements are batched once per page model and cached across visits; unchanged lines skip re-rendering. Native image preparation inspects text roles only, avoiding decorative geometry style reads.

Web sharing sends readable pad text with its canonical link. Native sharing exports the complete positioned text and artwork as a PNG and includes canonical-pad and app-home links. Copied text includes the same footer. Native preparation warms the font and saves the PNG ahead of the tap; zoom does not invalidate it. Export omits viewport-only empty height and caps image width at 1080 pixels. See [the frontend handoff](docs/frontend-handoff.md) for module boundaries and behavior.

Shodash Geet bookmarks are independent of Pad Ratnakar and appear in their own saved collection. Existing numeric bookmarks remain Pad Ratnakar bookmarks; historical data cannot identify which edition they came from.

All 18 Shodash recordings can be downloaded individually and replayed offline. The bottom divider is a seek bar with elapsed and total time. Playing audio follows Shodash navigation, advances through the sequence, and stops after Pushpika. Leaving the reader stops playback. Backgrounding the app pauses audio and cancels pending downloads; returning requires tapping Play. See [audio delivery and verification](docs/shodash-audio.md).

Kallolini and Pad Ratnakar use the same section-sheet presentation with pad ranges. Kallolini musical headings use the canonical reader’s proportional breathing room; source line extents and indentation remain. Original sakhi drawings from its scan appear in Kallolini 8 and alternating left/right illustration columns in Pad Ratnakar 48. Both illustrated pads use straight stanza columns, natural word spacing and wider text areas. Both pages contain the same complete source PNGs at their original proportions; artwork checksums also invalidate prepared share images after a drawing changes. They load only for these pages. All collections normalize to the same 288-unit content page before adding the border; newer collections share the canonical 15-unit body-size seed, with uniform per-pad fitting where original lines need more room. RKK stanza blocks are centered with modest continuation indentation. Pinch uses a persistent contained compositor layer, and background share rasterization yields to active pinch input. The RKK collection contains only the 116 Hindi translation lines from the supplied trilingual scan, with source-page provenance. Pad lists show three-line excerpts with an ellipsis; search results use one consistent row across collections, measure surrounding matching words to fit the available width, and show ellipses only at omitted boundaries, and the header menu button toggles open/closed.

## Native shells

After a verified web build, copy assets into the Capacitor projects with:

```sh
npm run native:sync
```

This synchronizes assets only; it does not build, sign, or test a native release. See the [release guide](docs/release/README.md) for the current Android candidate and signing workflow. The iPhone/iPad project is being prepared in parallel; see the [iOS handoff](docs/release/ios.md) for build status and the remaining signing and device checks.

## Documentation

Start with the [documentation index](docs/README.md). It links the maintained guides, release material, and historical audit snapshots.

Future agents: after a major product, architecture, data, or release change, review and update this README. Keep it under 200 lines.

Android downloads are served at `/android` with a stable `/downloads/pad-ratnakar-latest.apk` link. Replace the signed APK in `public/downloads/` and update the page version for each public release; native builds exclude the downloadable APK. Full zoom-out resets the reader transform and nested scrolling and returns to the page top.
