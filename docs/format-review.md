# Local format review

Start with `npm run review`, then open `http://127.0.0.1:8766/review/` in a wide desktop browser window. This builds the current reader and starts a loopback-only Python server. PyMuPDF from `requirements.txt` is needed for PDF images.

The left side is the actual built app inside a 390 × 780 CSS-pixel viewport, scaled to fit the available workspace. The selector also offers 320 × 640 and 430 × 860. Font controls inside the app still work. This is a browser preview, not Android emulation. App scrolling/swipe fixes are outside this review tool's scope.

The center has one comment box per canonical pad. Typing saves a browser draft immediately and a SQLite record after a short pause. Navigation waits for a successful disk save. A failed save keeps the current pad and draft. Reload restores unsaved drafts and the last position. Reviews never modify corpus text.

- **Verified & next:** save the comment, mark verified, advance. Shortcut: Cmd/Ctrl + Enter.
- **Format issue & next:** flag without requiring any comment, then advance. Shortcut: Cmd/Ctrl + Shift + Enter.
- **Save comment & next:** save and advance; a non-empty comment on a pending pad flags it as an issue. Shortcut: Alt + Right.
- **Previous:** save and return. Shortcut: Alt + Left.
- **Next unreviewed:** skip pads already verified or flagged.
- Use the pad number to jump directly. **Mark unreviewed** clears the decision but keeps the comment.

Shortcuts also work when focus is inside the app preview. Comments and decisions belong to pad IDs, not physical PDF page numbers.

The right side renders the original source PDF, cropped around the pad's source positions, with a little surrounding context. Every continuation page and shared/continued footnote page is included. **Full pages** shows the entire source page; clicking an image opens it at full size. The PDF is read directly; OCR is not used.

## Storage and backup

Comments are stored at `.review/reviews.sqlite3`, excluded from Git. Do not remove this directory during cleanup. **Export comments** downloads a JSON backup. The database keeps one current comment, status, viewport dimensions, and save timestamp per pad. No account, external service or API credential is used.

This tool currently reviews canonical pads 1–1565. Shodash-specific display review is not a separate queue. The app is a build snapshot: rerun `npm run review` after reader changes so the preview includes them.

## Verification

`npm run test:review` checks durable saves/updates, invalid-write rejection, continued/shared footnote coverage, and PDF rendering. The normal `npm run check` includes these tests.

Browser verification used an isolated temporary store, not real review data. It covered comment + advance, keyboard verification, issue + advance from inside the iframe, reload persistence, a simulated unavailable database, and successful draft recovery. The desktop three-column layout was visually checked. Test comments are not present in the real review store.
