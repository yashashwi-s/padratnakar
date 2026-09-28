# Swipe Lag Investigation — Attempts Log

Starting point: commit `c04e981` — "Allow rapid swipes to interrupt reader settling motion"

The reported issue: **when swiping between pads, the pads "drop and settle"** — a visible jitter/snap at the end of the swipe animation.

---

## Attempt 1 — Reorder completion sequence in `reader-slider.js`

**Hypothesis:** `motion.cancel()` was called first in `motion.finished.then()`, which released the `fill:forwards` hold, causing the track to snap back to transform=0 for one frame before `reset()` cleared `padding-top` on the neighbour panels.

**Changes made:**
- `src/lib/reader-slider.js` — rewrote the `.then()` completion block to: strip `padding-top`, set explicit inline `transform: translate3d(${target}px,0,0)` to hold position, then `cancel()`, then `commit()`, then manually clear offset/origin and remove inline transform.

**Why it still failed:**
- `go()` calls `slider.reset()` internally, which immediately removed the inline transform — so the "hold" was undone before React re-rendered the new panel. The completion handler and `go()` → `reset()` fought each other.

---

## Attempt 2 — Three-part fix: `commitStyles()`, layout pre-caching, GPU hints

**Hypothesis (expanded):** Three compounding causes:

1. **Primary — async SVG height change:** `PadTypography` fetches layout geometry via `getPrintLayout(pad.id)` asynchronously. Neighbour panels mount with `layout=null` (fallback `page.width=288`), then when the layout chunk arrives the SVG height changes dramatically. If this happens after the swipe commits, the newly-current pad visibly reflows height.
2. **GPU layer thrashing:** `.reader-track` had no `will-change` hint, so Android WebView created/destroyed a GPU compositor layer on each animation start/stop.
3. **Animation cancel releasing fill:** same as Attempt 1, but tried `motion.commitStyles()`.

**Changes made:**
- `src/lib/reader-slider.js` — used `motion.commitStyles()` (with fallback) before `cancel()`, then let `go()` → `reset()` handle cleanup.
- `src/App.jsx` — added `useEffect` to pre-fetch `getPrintLayout()` for ±1 neighbour pads whenever `position` changes.
- `src/index.css` — added `will-change: transform` to `.reader-track`.

**Why it still failed:**
- `commitStyles()` bakes the inline transform but `go()` → `reset()` still removes it synchronously inside `flushSync` before the compositor commits the new panel position.

---

## Attempt 3 — Inline transform safety net + `committing` flag + CSS `contain` + `backface-visibility`

**Hypothesis:** The fix must ensure the track stays at `target` px throughout: cancel → React re-render → DOM swap → transform removal — all in one composited frame.

**Changes made:**
- `src/lib/reader-slider.js`:
  - Set `track.style.setProperty("transform", translate3d(target))` **before** `.animate()` so the inline style is the fallback when animation is cancelled.
  - Added `committing = true/false` flag around `commit()` so `reset()` (called from `go()`) skips removing the inline transform mid-commit.
  - After `commit()` returns, manually remove the transform.
- `src/index.css`:
  - `will-change: transform` on `.reader-track`
  - `contain: layout style paint` on `.reader-panel`
  - `backface-visibility: hidden` on `.is-neighbour`

**Why it still failed:**
- All 40 tests passed. Visually on device the issue persisted.
- The "drop and settle" is likely not a JavaScript timing issue at all. The compositor on Android WebView may be causing the jitter from the `position: relative ↔ absolute` swap between `.is-current` and `.is-neighbour` panels during the React re-render, or from `padding-top` removal causing a reflow the compositor sees as a geometry change on the promoted GPU layer.

---

## Root cause — Not yet resolved

Likely directions to investigate further:

1. **Eliminate the CSS position swap entirely** — keep all panels `position:absolute` always and update visibility via `z-index`. Avoids a reflow that triggers compositor re-tiling.
2. **Replace Web Animations API with CSS transitions** — use a CSS class toggle that triggers `transition: transform` on the track, handled entirely on the GPU compositor thread.
3. **Profile on-device** — attach `chrome://inspect` to Android WebView and use the Performance tab to identify exactly which frame causes the jitter.
4. **Check `scrollTo(0)` in `go()`** — `window.scrollTo({ top: 0, behavior: "instant" })` inside `flushSync` may cause a compositor snap on Android if the viewport was scrolled.

---

## Files changed (all reverted to `c04e981`)

- `src/lib/reader-slider.js` — reverted
- `src/App.jsx` — reverted
- `src/index.css` — reverted
