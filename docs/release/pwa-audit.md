# PWA audit — 25 September 2026

Preserved clean routes, legacy hash normalization and web text/native PNG sharing.

Fixed two offline correctness problems: previously-unvisited geometry was unavailable offline, and a fixed CacheFirst bucket retained old geometry for a year. All 16 chunks now join the revisioned precache. Installation completes only after all required assets are cached; initial download is larger in exchange for a complete offline book. Updates wait for old sessions to close instead of replacing their worker mid-read. Native Capacitor does not register a worker, and development builds no longer register a nonexistent worker. Added a padded maskable icon. Build now precedes tests so tests inspect current output rather than a previous build.

69 JS tests, corpus/layout validation and four review tests pass against freshly built artifacts. This verifies generated manifest, icons, all offline geometry entries, navigation fallback and routing. Browser install prompts, airplane-mode relaunch and iOS home-screen installation still need end-to-end device verification; these are not claimed as tested. Browser storage can be evicted by the OS.

References: https://developer.chrome.com/docs/workbox/modules/workbox-precaching and https://vite-pwa-org.netlify.app/guide/auto-update.
