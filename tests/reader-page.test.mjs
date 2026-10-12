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
  const right = Math.max(...lines.map((l) => l.x + l.length));
  assert.ok(Math.abs(left - 26 - (page.width - 2 - right)) < 1e-9);
  assert.ok(lines.every((l) => l.fontSize === 15));
  assert.equal(lines[1].x - lines[0].x, 18);
  assert.equal(lines.length, 116);
});

test("stanza collections fit the same long line at the canonical reader's width and body size", () => {
  const canonical = fixedPrintModel(
    {
      id: 1,
      headings: [],
      verses: ["पहली पंक्ति।", "दूसरी पंक्ति॥"],
      stanzas: [["पहली पंक्ति।", "दूसरी पंक्ति॥"]],
    },
    null,
  );
  const first = canonical.lines.find((l) => l.role === "verse");
  for (const mode of ["jayanti", "madhupark"]) {
    const collection = readerCollections[mode];
    const pad = collection.pads.find(
      (p) => p.printedNumber && !p.sectionHeading,
    );
    // 300 at the 18-unit measuring size is 250 at the canonical 15-unit size.
    // It fits the canonical 260-unit room and must not shrink to the old 236.
    const page = collection.page(
      pad,
      pad.verses.map(() => 300),
    );
    const body = page.lines.filter((l) => l.role === "verse");
    assert.equal(body[0].x, first.x);
    assert.equal(body[0].y, first.y);
    assert(body.every((l) => l.fontSize === first.fontSize));
    assert.equal(body[1].y - body[0].y, pad.stanzas[0].length === 1 ? 28 : 20);
    const boundary = pad.stanzas[0].length;
    if (boundary < body.length)
      assert.equal(body[boundary].y - body[boundary - 1].y, 28);
    const long = collection
      .page(
        pad,
        pad.verses.map(() => 600),
      )
      .lines.filter((l) => l.role === "verse");
    assert.equal(new Set(long.map((l) => l.fontSize)).size, 1);
    assert(long.every((l) => l.x + l.length <= 286.001));
  }
});
