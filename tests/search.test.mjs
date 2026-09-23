import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeSearchIndex, searchPads, normalize } from "../src/lib/search.js";
const pads = JSON.parse(
  fs.readFileSync(new URL("../src/data/hymns.json", import.meta.url), "utf8"),
);
const index = makeSearchIndex(pads);
test("Arabic and Devanagari pad numbers are exact, never prefixes", () => {
  assert.deepEqual(
    searchPads(index, "१५०८").map((x) => x.pad.id),
    [1508],
  );
  assert.deepEqual(
    searchPads(index, "1").map((x) => x.pad.id),
    [1],
  );
  assert.equal(searchPads(index, "9999").length, 0);
});
test("full corpus lines, including late lines, are indexed", () => {
  for (const id of [1, 18, 550, 608, 1025, 1200, 1504, 1508, 1565]) {
    const p = pads[id - 1];
    const line = p.verses.at(-1);
    assert(
      searchPads(index, line, { phrase: true }).some((x) => x.pad.id === id),
      `Missing final line ${id}`,
    );
  }
});
test("Hindi title ranks first and romanized common phrases find the pad", () => {
  assert.equal(searchPads(index, "दोउ चकोर")[0].pad.id, 1);
  assert(searchPads(index, "dou chakor").some((x) => x.pad.id === 1));
  assert(searchPads(index, "radhike").some((x) => x.pad.id === 550));
});
test("multiple query words all required, strict phrase preserves order", () => {
  const tiny = makeSearchIndex([
    { id: 1, title: "राम", verses: ["राम श्याम दयालु"], section: "अ" },
    { id: 2, title: "राम", verses: ["राम दयालु"], section: "ब" },
  ]);
  assert.deepEqual(
    searchPads(tiny, "राम श्याम").map((x) => x.pad.id),
    [1],
  );
  assert.equal(searchPads(tiny, "श्याम राम", { phrase: true }).length, 0);
  assert.deepEqual(
    searchPads(tiny, "राम", { section: "ब" }).map((x) => x.pad.id),
    [2],
  );
});
test("punctuation and shaping controls normalize only for search", () => {
  assert.equal(normalize("श्रीकृष्ण—प्रेम"), normalize("श्रीकृष्ण प्रेम"));
  assert.equal(normalize("भगवान्‌का"), normalize("भगवान्का"));
  const before = JSON.stringify(pads);
  searchPads(index, "कृष्ण");
  assert.equal(JSON.stringify(pads), before);
});
test("footnote text is searchable", () => {
  const owner = pads.find((p) =>
    p.footnotes?.some((f) => f.sourcePages.includes(940)),
  );
  assert(owner);
  const text = owner.footnotes[0].lines[0];
  assert(
    searchPads(index, text, { phrase: true }).some(
      (x) => x.pad.id === owner.id,
    ),
  );
});
test("all available results remain accessible", () => {
  const count = pads.filter((p) =>
    normalize(
      [
        p.title,
        p.section,
        p.subtopic,
        p.raag,
        p.taal,
        p.form,
        ...(p.headings || []),
        ...p.verses,
        ...(p.footnoteRefs?.length
          ? p.footnoteRefs.map(
              (r) => pads[r.ownerPadId - 1].footnotes[r.noteIndex],
            )
          : p.footnotes || []
        ).flatMap((f) => f.lines),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes("प्रेम"),
  ).length;
  assert.equal(searchPads(index, "प्रेम", { phrase: true }).length, count);
  assert(count > 50);
});

test("shared footnotes are searchable on each referenced pad", () => {
  const line = pads[270].footnotes[0].lines[0];
  const found = searchPads(index, line, { phrase: true }).map((r) => r.pad.id);
  for (const id of [269, 270, 271]) assert(found.includes(id));
});
