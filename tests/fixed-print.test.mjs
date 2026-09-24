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
test("pad 1 adds line and stanza breathing room while preserving horizontal positions", () => {
  const page = fixedPrintModel(getPad(1), layout(1));
  const body = page.lines.filter((l) => l.role === "verse");
  assert(Math.abs(body[1].y - body[0].y - 19.92) < 0.001);
  assert(Math.abs(body[2].y - body[1].y - 27.92) < 0.001);
  assert.equal(body[2].segments.length, 4);
  assert.equal(body[2].segments[0].bbox[0], 26.04);
});
test("fixed page fits the viewport with a reading-width cap", () => {
  assert.equal(pageDimensions(390).width, 390);
  assert.equal(pageDimensions(320).width, 320);
  assert.equal(pageDimensions(390).width, 390);
  assert.equal(pageDimensions(1440).width, 560);
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

test("musical heading-to-body spacing is uniform, including Shodash", () => {
  const entries = Array.from({ length: 1565 }, (_, i) => [getPad(i + 1), null]);
  entries.push(
    ...shodashCollection.items.map((item) => [getPad(item.padId), item]),
  );
  for (const [pad, item] of entries) {
    const page = fixedPrintModel(pad, layout(pad.id), item);
    const first = page.lines.findIndex((l) =>
      ["verse", "citation"].includes(l.role),
    );
    if ((item?.headings || pad.headings).length)
      assert(
        Math.abs(page.lines[first].y - page.lines[first - 1].y - 60) < 0.00001,
        `Gap ${pad.id}`,
      );
  }
});
test("collection corrections do not inherit canonical stanza boundaries or repeated stars", () => {
  for (const number of [5, 6, 13])
    assert.deepEqual(
      shodashCollection.items[number].stanzas.map((s) => s.length),
      [2, 2, 2, 2],
    );
  const lines = shodashCollection.items[10].stanzas.flat();
  assert.equal(lines.join("").split("*").length - 1, 1);
  assert(lines[5].replace("*", "").endsWith("भगवान॥३॥"));
  assert.equal(getPad(24).headings.length, 1);
  assert(getPad(24).verses[0].startsWith("राधा-नयन"));
});

test("pad 54 separates its three-line opening stanza", () => {
  const pad = getPad(54),
    page = fixedPrintModel(pad, layout(54));
  assert.equal(pad.stanzas[0].length, 3);
  const body = page.lines.filter((line) => line.role === "verse");
  const originalGap = body[3].source.baseline - body[2].source.baseline;
  assert.equal(body[3].y - body[2].y, Math.max(10, originalGap) + 11);
});

test("Pushpika separates the title, verses and final dedication", () => {
  const item = shodashCollection.items.at(-1);
  const page = fixedPrintModel(getPad(item.padId), layout(item.padId), item);
  const title = page.lines.find((line) => line.text === item.title);
  const verses = page.lines.filter((line) => line.role === "verse");
  const dedication = page.lines.find((line) => line.role === "dedication");
  assert.equal(verses[0].y - title.y, 60);
  assert.equal(dedication.y - verses.at(-1).y, 60);
});
