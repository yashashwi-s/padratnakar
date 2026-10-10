import { test } from "node:test";
import assert from "node:assert/strict";
import indexMap from "../src/data/index_map.json" with { type: "json" };
import hymns from "../src/data/hymns.json" with { type: "json" };
import catalog from "../data/source/catalog.json" with { type: "json" };
import { findSectionMatches } from "../src/lib/sections.js";
import { makeSearchIndex, searchPads } from "../src/lib/search.js";

// Boundaries visually checked against the supplied contents scan, October 10.
test("all printed main sections have the reviewed pad boundaries", () => {
  assert.deepEqual(
    indexMap.topics.map((s) => [s.startPad, s.endPad]),
    [
      [1, 152],
      [153, 203],
      [204, 232],
      [233, 416],
      [417, 533],
      [534, 607],
      [608, 660],
      [661, 752],
      [753, 823],
      [824, 854],
      [855, 929],
      [930, 960],
      [961, 997],
      [998, 1021],
      [1022, 1050],
      [1051, 1119],
      [1120, 1256],
      [1257, 1503],
      [1504, 1565],
    ],
  );
  assert.equal(indexMap.topics[2].name, "बाल-माधुरीकी झाँकियाँ");
  assert.equal(indexMap.topics[10].name, "भगवान्‌के विविध स्वरूपोंका गुण-गान");
});

test("sections cover every pad once and subsections cover their entire parent", () => {
  let next = 1;
  for (const section of indexMap.topics) {
    assert.equal(section.startPad, next);
    assert(section.endPad >= section.startPad);
    next = section.endPad + 1;
    if (!section.subtopics.length) continue;
    let subNext = section.startPad;
    for (const sub of section.subtopics) {
      assert.equal(sub.startPad, subNext, sub.name);
      assert(sub.endPad >= sub.startPad, sub.name);
      subNext = sub.endPad + 1;
    }
    assert.equal(subNext, section.endPad + 1, section.name);
  }
  assert.equal(next, indexMap.totalPads + 1);
});

test("catalog, reader metadata, and section navigation agree for all 1565 pads", () => {
  for (const pad of hymns) {
    const section = indexMap.topics.find(
      (s) => pad.id >= s.startPad && pad.id <= s.endPad,
    );
    const sub = section.subtopics.find(
      (s) => pad.id >= s.startPad && pad.id <= s.endPad,
    );
    for (const entry of [pad, catalog[pad.id - 1]]) {
      assert.equal(entry.section, section.name, `pad ${pad.id}`);
      assert.equal(entry.subtopic, sub?.name ?? null, `pad ${pad.id}`);
    }
  }
});

test("restored subsections and their boundaries match the contents", () => {
  const waves = indexMap.topics.find((s) => s.startPad === 417);
  assert.deepEqual(
    waves.subtopics.map((s) => [s.name, s.startPad, s.endPad]),
    [
      ["पूर्वराग", 417, 447],
      ["मधुर अभिलाषा", 448, 463],
      ["मधुर अनुभूति", 464, 525],
      ["विचित्र तरंगें", 526, 533],
    ],
  );
  const conduct = indexMap.topics.find((s) => s.startPad === 1257);
  assert.deepEqual(conduct.subtopics.at(-1), {
    name: "मानवता",
    startPad: 1354,
    endPad: 1503,
  });
  for (const query of [
    "भैया",
    "सर्वदोषमय",
    "प्रभु-चरणोंमें",
    "योगभ्रष्ट पुण्यलोकोंमें",
    "एक सत्य जो परम तत्त्व",
  ]) {
    assert.equal(findSectionMatches(indexMap.topics, query).length, 0, query);
  }
});

test("section search finds the corrected names in Hindi and romanized Hindi", () => {
  for (const query of [
    "बाल माधुरी",
    "bal madhuri",
    "baal maadhuri",
    "बाल madhuri",
  ]) {
    assert(
      findSectionMatches(indexMap.topics, query).some(
        (m) => m.section.startPad === 204,
      ),
      query,
    );
  }
  for (const query of ["पूर्वराग", "purvarag"]) {
    assert(
      findSectionMatches(indexMap.topics, query).some(
        (m) => m.section.startPad === 417 && m.subtopic?.startPad === 417,
      ),
      query,
    );
  }
  assert(
    findSectionMatches(indexMap.topics, "मानवता").some(
      (m) => m.section.startPad === 1257 && m.subtopic?.startPad === 1354,
    ),
  );
});

test("pad search includes the restored classification at changed boundaries", () => {
  const index = makeSearchIndex(hymns);
  for (const [query, ids] of [
    ["पूर्वराग", [417, 447]],
    ["विचित्र तरंगें", [526, 533]],
    ["मधुर अनुभूति", [473, 525]],
    ["विविध स्वरूपोंका", [855, 929]],
  ]) {
    const found = new Set(
      searchPads(index, query).map((result) => result.pad.id),
    );
    for (const id of ids) assert(found.has(id), `${query}: pad ${id}`);
  }
});
