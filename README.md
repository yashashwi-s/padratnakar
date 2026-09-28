# पद-रत्नाकर

Pad Ratnakar is an offline React/Vite reader for Hindi devotional literature. Reading data, search material, fonts, and source-layout metadata ship with the app; it has no production backend or account system.

## Collections

The reader contains four collections:

| Collection                            |    Entries |
| ------------------------------------- | ---------: |
| _Pad Ratnakar_                        | 1,565 pads |
| _Shodash Geet_                        | 18 entries |
| _Shri Bhaiji Jayanti Mahotsav ke Pad_ |    18 pads |
| _Mahabhav-Kallolini_                  |   117 pads |

Canonical pads retain accepted Unicode text, source provenance, headings, stanzas, and shared footnotes. _Shodash Geet_ has collection-specific display rules that remain separate from canonical pad data.

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

The inner reader renders source-positioned Unicode lines as an SVG page. It preserves printed line endings, fits the full page to the available width, and supports pinch zoom with horizontal panning inside the page. Do not reintroduce responsive line wrapping or pad canonical text with spaces to imitate PDF alignment.

Web sharing sends readable pad text with its canonical link. Native sharing exports the full positioned reader page as a PNG and includes the link in the share text. See [the frontend handoff](docs/frontend-handoff.md) for module boundaries and behavior.

## Native shells

After a verified web build, copy assets into the Capacitor projects with:

```sh
npm run native:sync
```

This synchronizes assets only; it does not build, sign, or test a native release. See the [release guide](docs/release/README.md) for the current Android candidate and signing workflow. iOS binary/device verification remains separate.

## Documentation

Start with the [documentation index](docs/README.md). It links the maintained guides, release material, and historical audit snapshots.

Future agents: after a major product, architecture, data, or release change, review and update this README. Keep it under 200 lines.
