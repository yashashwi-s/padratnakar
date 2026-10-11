import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReaderPage } from "../src/lib/reader-page.js";
import { readerCollections } from "../src/lib/reader-collections.js";
import { fixedPrintModel } from "../src/lib/fixed-print.js";
import { getPad } from "../src/lib/corpus.js";

test("every collection gets the same border and margin scale as Pad Ratnakar", () => {
  const reference = fixedPrintModel(getPad(1), null);
  for (const collection of Object.values(readerCollections)) {
    for (const pad of collection.pads) {
      const original = collection.page(pad);
      const page = normalizeReaderPage(original);
      assert.equal(page.width, reference.width);
      assert.deepEqual(
        page.lines.map((l) => l.text),
        original.lines.map((l) => l.text),
      );
      assert.ok(
        page.lines.every((l) => Number.isFinite(l.x) && Number.isFinite(l.y)),
      );
      assert.ok(page.lines.every((l) => l.x >= 0 && l.x <= page.width));
    }
  }
});
test("RKK uses a centered block and common 15-unit body seed with modest continuation indentation", () => {
  const collection = readerCollections.rkk;
  const pad = collection.pads[0];
  const widths = pad.verses.map((_, i) => (i % 2 ? 150 : 200));
  const page = collection.page(pad, widths);
  const lines = page.lines.filter((l) => l.role === "verse");
  const left = Math.min(...lines.map((l) => l.x));
  const right = Math.max(...lines.map((l) => l.x + l.fitWidth));
  assert.ok(Math.abs(left - (page.width - right)) < 1e-9);
  assert.ok(lines.every((l) => l.fontSize === 15));
  assert.equal(lines[1].x - lines[0].x, 18);
  assert.equal(lines.length, 116);
});
