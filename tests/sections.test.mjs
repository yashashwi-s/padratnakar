import { test } from "node:test";
import assert from "node:assert/strict";
import indexMap from "../src/data/index_map.json" with { type: "json" };
import { findSectionMatches } from "../src/lib/sections.js";

test("search finds navigable sections and subsections in Hindi or romanized Hindi", () => {
  const section = findSectionMatches(indexMap.topics, "बाल-लीला");
  assert(
    section.some((match) => match.section.startPad === 200 && !match.subtopic),
  );

  for (const query of ["भैया", "bhaiya"]) {
    const matches = findSectionMatches(indexMap.topics, query);
    assert(
      matches.some(
        (match) =>
          match.section.startPad === 200 &&
          match.subtopic?.startPad === 200 &&
          match.subtopic?.endPad === 203,
      ),
    );
  }
});
test("section search tolerates common short and long Latin vowels", () => {
  for (const query of ["bal lila", "baal leela", "बाल lila"]) {
    assert(
      findSectionMatches(indexMap.topics, query).some(
        (m) => m.section.startPad === 200,
      ),
      query,
    );
  }
});
