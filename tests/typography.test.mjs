import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeOpeningQuotes,
  normalizeSegmentsForDisplay,
  normalizeTextLines,
  normalizeTypographyStanzas,
  typographyModel,
  printSegments,
} from "../src/lib/typography.js";
import { getPad, shodashCollection } from "../src/lib/corpus.js";
const chunks = new Map();

test("normalizes paired Hindi opening quotes for display only", () => {
  assert.equal(normalizeOpeningQuotes("'राधा’"), "‘राधा’");
  assert.equal(
    normalizeOpeningQuotes("कहते—'खोलो द्वार’ और 'जाओ’॥"),
    "कहते—‘खोलो द्वार’ और ‘जाओ’॥",
  );
  assert.equal(normalizeOpeningQuotes("can't 'test"), "can't 'test");
  assert.equal(normalizeOpeningQuotes("'राधा"), "‘राधा");
  assert.equal(normalizeOpeningQuotes("राम'ही"), "राम'ही");
  assert.deepEqual(
    normalizeSegmentsForDisplay([
      { text: "'रा", runs: [{ text: "'रा", raised: false }] },
      { text: "धा’", runs: [{ text: "धा’", raised: false }] },
    ]),
    [
      { text: "‘रा", runs: [{ text: "‘रा", raised: false }] },
      { text: "धा’", runs: [{ text: "धा’", raised: false }] },
    ],
  );
  assert.deepEqual(normalizeTextLines(["'राधा", "’ तक"]), ["‘राधा", "’ तक"]);
  const pad62 = typographyModel(getPad(62), layout(62));
  const display62 = normalizeTypographyStanzas(pad62);
  assert.equal(
    display62
      .flat()
      .map((line) => line.text)
      .join("\n")
      .includes("'मैं"),
    false,
  );
  const display94 = normalizeTypographyStanzas(
    typographyModel(getPad(94), layout(94)),
  );
  assert.equal(display94.flat()[0].text.startsWith("‘विपदा"), true);
});

function layout(id) {
  const chunk = Math.floor((id - 1) / 100) + 1;
  if (!chunks.has(chunk))
    chunks.set(
      chunk,
      JSON.parse(
        readFileSync(
          new URL(`../public/data/layout/${chunk}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
  return chunks.get(chunk)[id];
}
test("typographic grouping preserves every canonical line exactly across all 1565 pads", () => {
  for (let id = 1; id <= 1565; id++) {
    const pad = getPad(id),
      model = typographyModel(pad, layout(id));
    assert.deepEqual(
      model.map((s) => s.map((l) => l.segments.map((x) => x.text).join(""))),
      pad.stanzas,
      `Pad ${id}`,
    );
    assert(
      model.flat().every((l) => l.source),
      `Missing source row ${id}`,
    );
  }
});
test("collection typography preserves numbering and its displayed opening line", () => {
  for (const item of shodashCollection.items) {
    const model = typographyModel(getPad(item.padId), layout(item.padId), item);
    assert.deepEqual(
      model.map((s) => s.map((l) => l.segments.map((x) => x.text).join(""))),
      item.stanzas,
    );
    assert(model.flat().every((l) => l.source));
  }
});
test("legacy shaping boundary has a complete-line fallback without guessed segmentation", () => {
  const line = typographyModel(getPad(992), layout(992)).flat()[2];
  assert.equal(line.segments.length, 1);
  assert.equal(line.segments[0].text, getPad(992).verses[2]);
});
test("a font fragment split inside a Devanagari word never splits its shaping context", () => {
  const source = {
    segmentTextAligned: true,
    segments: [
      { text: "श्री", bbox: [0, 0, 10, 15], baseline: 12, fontSize: 15 },
      { text: "कृष्ण", bbox: [10, 0, 30, 15], baseline: 12, fontSize: 15 },
    ],
  };
  assert.deepEqual(
    printSegments("श्रीकृष्ण", "श्रीकृष्ण", source).map((s) => s.text),
    ["श्रीकृष्ण"],
  );
});
test("text remains complete when layout data cannot load", () => {
  const pad = getPad(1504);
  assert.deepEqual(
    typographyModel(pad, null).map((s) => s.map((l) => l.text)),
    pad.stanzas,
  );
});

test("raised note markers retain their source role", () => {
  const model = typographyModel(getPad(104), layout(104));
  const runs = model
    .flat()
    .flatMap((l) => l.segments.flatMap((s) => s.runs || []));
  assert.deepEqual(
    runs.filter((r) => r.raised).map((r) => r.text.trim()),
    ["१", "२"],
  );
  for (const l of model.flat())
    for (const s of l.segments)
      if (s.runs) assert.equal(s.runs.map((r) => r.text).join(""), s.text);
});
