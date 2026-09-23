# Repository organization

The repository now has one application and one maintained corpus pipeline. It contains no OCR experiment runner, recovery portal, scraped candidate corpus, loose page screenshot, old extraction dump or unused template component.

| Location                        | Purpose                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `src/`                          | React reader, reusable corpus/search access and accepted text         |
| `public/`                       | Supplied logo, licensed offline font, compact lazy layout chunks      |
| `data/source/`                  | Original PDF, decoded candidate snapshot, human review snapshot       |
| `data/shodash-geet-layout.json` | Generated collection-only display data                                |
| `scripts/corpus/`               | One rebuild entrypoint and the modules it uses                        |
| `scripts/corpus/vendor/`        | Inherited legacy converter table, isolated from app code              |
| `tests/`                        | JavaScript behavior and whole-corpus/data-contract checks             |
| `docs/`                         | Data contracts, source audits and frontend handoff                    |
| `android/`, `ios/`              | Capacitor project shells; generated web copies/build products ignored |

Removed material includes legacy OCR/master-extraction scripts, their large dump files, index screenshots, unused components/context/search hook, Vite template assets, obsolete retagging output, and the unused converter gitlink. Source PDF and required converter code were moved into purpose-specific directories. Generic native example tests were removed; they did not test this application.

Before removal, historical working files were archived outside the repository with paths and hashes. That local archive is not a runtime or build dependency; tracked historical versions also remain in Git history. Character-level layout dumps can be regenerated on demand from the retained source PDF.

The repository ignores credentials, virtual environments, caches, dependencies, native build output and copied web bundles. No API key is required to build or run the reader. Do not commit `.env`, local review databases, machine-specific SDK paths or signing credentials.
