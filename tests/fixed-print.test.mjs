import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPad, getFootnotes, shodashCollection } from "../src/lib/corpus.js";
import { normalizeOpeningQuotes } from "../src/lib/typography.js";
import { fixedPrintModel, pageDimensions } from "../src/lib/fixed-print.js";
const chunks = new Map();
function layout(id) {
  const n = Math.ceil(id / 100);
  if (!chunks.has(n))
    chunks.set(
      n,
      JSON.parse(
        readFileSync(
          new URL(`../public/data/layout/${n}.json`, import.meta.url),
        ),
      ),
    );
  return chunks.get(n)[id];
}
test("fixed print preserves every canonical verse and finite ordered baselines in all pads", () => {
  for (let id = 1; id <= 1565; id++) {
    const pad = getPad(id),
      page = fixedPrintModel(pad, layout(id));
    const body = page.lines.filter((l) =>
      ["verse", "citation"].includes(l.role),
    );
    assert.deepEqual(
      body.map((l) => l.text),
      pad.verses.map(normalizeOpeningQuotes),
      `Text ${id}`,
    );
    assert(
      page.lines.every(
        (l) =>
          Number.isFinite(l.y) &&
          Number.isFinite(l.x) &&
          Number.isFinite(l.fontSize),
      ),
      `Coordinates ${id}`,
    );
    assert(
      page.lines.every((l, i) => !i || l.y > page.lines[i - 1].y),
      `Line order ${id}`,
    );
    assert.deepEqual(
      page.lines.filter((l) => l.role === "footnote").map((l) => l.text),
      getFootnotes(pad).flatMap((n) => n.lines.map(normalizeOpeningQuotes)),
      `Notes ${id}`,
    );
  }
});
test("pad 1 keeps PDF baseline gaps and original separated text positions", () => {
  const page = fixedPrintModel(getPad(1), layout(1));
  const body = page.lines.filter((l) => l.role === "verse");
  assert(Math.abs(body[1].y - body[0].y - 16.92) < 0.001);
  assert(Math.abs(body[2].y - body[1].y - 16.92) < 0.001);
  assert.equal(body[2].segments.length, 4);
  assert.equal(body[2].segments[0].bbox[0], 26.04);
});
test("fit size is capped and zoom enlarges the entire fixed page without changing its model", () => {
  assert.equal(pageDimensions(390, 1, 1).width, 390);
  assert.equal(pageDimensions(320, 2, 1).width, 320);
  assert.equal(pageDimensions(390, 1, 2).width, 780);
  assert.equal(pageDimensions(1440, 1, 1).width, 560);
});
test("all collection entries keep their own headings, verse numbering and closing dedication", () => {
  for (const item of shodashCollection.items) {
    const page = fixedPrintModel(getPad(item.padId), layout(item.padId), item);
    assert(page.lines.some((l) => l.text === item.title));
    assert.deepEqual(
      page.lines
        .filter((l) => ["verse", "citation"].includes(l.role))
        .map((l) => l.text),
      item.stanzas.flat().map(normalizeOpeningQuotes),
    );
    if (item.role === "closing") {
      assert(page.lines.some((l) => l.role === "dedication"));
      assert(!page.lines.some((l) => l.role === "footnote"));
    }
  }
});
