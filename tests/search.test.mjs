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

test("punctuation-only input does not list the entire corpus", () => {
  for (const query of ["!!!", "॥", "—", "***", "😊"])
    assert.equal(searchPads(index, query).length, 0);
});
test("short roman words do not match inside unrelated words", () => {
  const tiny = makeSearchIndex([
    { id: 1, verses: ["परम प्रेम भ्रम"] },
    { id: 2, verses: ["राम नाम"] },
  ]);
  assert.deepEqual(
    searchPads(tiny, "ram").map((r) => r.pad.id),
    [2],
  );
  assert.deepEqual(
    searchPads(tiny, "raam").map((r) => r.pad.id),
    [2],
  );
});
test("Hindi and romanized terms can be combined", () => {
  const tiny = makeSearchIndex([
    { id: 1, verses: ["राधा प्रेम"] },
    { id: 2, verses: ["राधा नाम"] },
  ]);
  for (const q of [
    "radha प्रेम",
    "राधा prem",
    "radhaa prem",
    '"radha प्रेम"',
  ]) {
    assert.deepEqual(
      searchPads(tiny, q).map((r) => r.pad.id),
      [1],
      q,
    );
  }
});
test("exact matches outrank explicitly labelled spelling approximations", () => {
  const tiny = makeSearchIndex([
    { id: 1, title: "राधिका", verses: ["राधिका नाम"] },
    { id: 2, verses: ["राधिके प्रेम"] },
  ]);
  const results = searchPads(tiny, "radhike");
  assert.equal(results[0].pad.id, 2);
  assert.equal(results[0].matchKind, "exact");
  assert.equal(results[1].matchKind, "approximate");
  assert.equal(searchPads(tiny, '"radhike"').length, 1);
});
test("phrases cannot be fabricated across unrelated metadata", () => {
  const tiny = makeSearchIndex([
    {
      id: 1,
      title: "राम",
      section: "श्याम",
      verses: ["दयालु नाम", "प्रेम धाम"],
    },
  ]);
  assert.equal(searchPads(tiny, '"राम श्याम"').length, 0);
  assert.equal(searchPads(tiny, '"नाम प्रेम"').length, 1);
});
test("snippets prefer the line containing all terms and retain footnote context", () => {
  const tiny = makeSearchIndex([
    {
      id: 1,
      verses: ["राधा नाम", "राधा प्रेम"],
      footnotes: [{ lines: ["विशेष टिप्पणी"] }],
    },
  ]);
  assert.equal(searchPads(tiny, "राधा प्रेम")[0].snippet, "राधा प्रेम");
  assert.equal(searchPads(tiny, "टिप्पणी")[0].snippetKind, "footnote");
});
test("canonical-equivalent nukta spellings and shaping controls match", () => {
  const tiny = makeSearchIndex([{ id: 1, verses: ["बड़े भगवान्‌का"] }]);
  assert.equal(searchPads(tiny, "बड़े भगवान्का").length, 1);
});
test("number labels and collection-specific numbers are unambiguous", () => {
  const tiny = makeSearchIndex([
    { id: 610, searchNumber: 6, verses: ["गीत"] },
    { id: 1, searchNumber: null, verses: ["वन्दना"] },
  ]);
  for (const q of ["6", "६", "pad 6", "पद संख्या ६"])
    assert.equal(searchPads(tiny, q)[0].pad.id, 610);
  assert.equal(searchPads(tiny, "610").length, 0);
  assert.equal(searchPads(tiny, "1").length, 0);
});
test("roman searches recognize joined Shri honorifics without substring noise", () => {
  const tiny = makeSearchIndex([
    { id: 1, verses: ["श्रीराधा श्रीकृष्ण श्रीराम"] },
    { id: 2, verses: ["परम नाम"] },
  ]);
  for (const q of ["radha", "krishna", "shri krishna", "ram"])
    assert.deepEqual(
      searchPads(tiny, q).map((r) => r.pad.id),
      [1],
      q,
    );
});
test("every canonical pad is discoverable by its complete last verse line", () => {
  for (const pad of pads) {
    assert(
      searchPads(index, pad.verses.at(-1), { phrase: true }).some(
        (r) => r.pad.id === pad.id,
      ),
      `Pad ${pad.id}`,
    );
  }
});
