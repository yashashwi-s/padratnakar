import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  kallolini,
  kalloliniPads,
  kalloliniPage,
} from "../src/lib/kallolini.js";
import { makeSearchIndex, searchPads } from "../src/lib/search.js";

test("Kallolini contains all numbered pads and the distinct closing aarti", () => {
  assert.equal(kallolini.entries.length, 117);
  assert.deepEqual(
    kallolini.entries.slice(0, 116).map((p) => p.printedNumber),
    Array.from({ length: 116 }, (_, i) => i + 1),
  );
  assert.equal(kallolini.entries[116].printedNumber, null);
  assert.equal(kallolini.entries[116].sectionId, "aarti");
  assert.deepEqual(
    kallolini.sections.map(
      (s) => kallolini.entries.filter((p) => p.sectionId === s.id).length,
    ),
    [17, 9, 52, 4, 5, 22, 7, 1],
  );
  assert.deepEqual(
    [...new Set(kallolini.entries.flatMap((p) => p.sourcePages))].sort(
      (a, b) => a - b,
    ),
    Array.from({ length: 66 }, (_, i) => i + 13),
  );
});
test("Every source-checked verse and musical label survives the fixed-page renderer", () => {
  for (const pad of kalloliniPads) {
    const page = kalloliniPage(pad);
    const body = page.lines.filter((line) => line.role !== "heading");
    assert.deepEqual(
      body.map((l) => l.text),
      pad.lines.filter((l) => l.role !== "musical-heading").map((l) => l.text),
      `entry ${pad.id}`,
    );
    for (const line of pad.lines.filter((l) => l.role === "musical-heading"))
      assert.ok(page.lines.some((l) => l.text === line.text));
    assert.ok(
      page.lines.every(
        (line, i) =>
          Number.isFinite(line.y) && (!i || line.y > page.lines[i - 1].y),
      ),
      `ordered baselines ${pad.id}`,
    );
    assert.ok(
      body.every(
        (l) =>
          Number.isFinite(l.x) &&
          l.length > 0 &&
          l.x >= 25 &&
          l.x + l.length <= 455,
      ),
      `margins ${pad.id}`,
    );
  }
});
test("Collection search does not duplicate a pad under its section", () => {
  const index = makeSearchIndex(kalloliniPads);
  assert.equal(index.length, 117);
  assert.equal(searchPads(index, "116").length, 1);
  assert.equal(searchPads(index, "116")[0].pad.id, 116);
  assert.ok(searchPads(index, "सौभाग्य").length >= 4);
});
test("Short source lines retain normal glyph proportions and use word gaps", () => {
  const pad = kalloliniPads[116];
  const page = kalloliniPage(pad, pad.verses.map(() => 100));
  const verses = page.lines.filter((line) => line.role === "verse");
  assert.ok(verses.length > 0);
  assert.ok(verses.every((line) => line.length === undefined));
  assert.ok(verses.some((line) => line.wordSpacing > 0));
});
test("The accepted build preserves proofread text and never imports comparison text", () => {
  const source = readFileSync(
    new URL("../data/collections/mahabhav-kallolini/build.py", import.meta.url),
    "utf8",
  );
  assert.ok(!source.includes("comparison-references.json"));
  assert.ok(!source.includes("src/data/hymns"));
  assert.equal(kallolini.source.pageCount, 84);
  assert.ok(
    kallolini.entries.every((e) => e.textStatus === "assistant-source-checked"),
  );
});

test("Reader identities keep collection bookmarks distinct from canonical pads", async () => {
  const { collectionPad, collectionBookmark } =
    await import("../src/lib/reader-collections.js");
  assert.equal(collectionPad("kallolini", 0), null);
  assert.equal(collectionPad("kallolini", 118), null);
  assert.equal(collectionBookmark("kallolini:17").pad.printedNumber, 17);
  assert.equal(collectionBookmark("jayanti:17").pad.kind, "charan-vandana");
  assert.equal(collectionBookmark("kallolini:999"), null);
});
test("User-approved Sanskrit correction is preserved exactly", () => {
  assert.ok(
    kallolini.entries[16].lines.some(
      (line) => line.text === "श्रीमत्परागपरमाद्भुतवैभवायाः",
    ),
  );
});
