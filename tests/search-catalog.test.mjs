import { test } from "node:test";
import assert from "node:assert/strict";
import {
  searchCollections,
  searchDocuments,
} from "../src/lib/search-catalog.js";
import { createSearchService } from "../src/lib/search-service.js";
const documents = searchDocuments();
const search = createSearchService(documents);
test("search uses each collection's own displayed numbers", () => {
  const result = search("10");
  for (const mode of ["pad", "jayanti", "kallolini"])
    assert.equal(result[mode][0].id, 10);
  const collection = searchCollections.find((c) => c.mode === "shodash");
  assert.equal(collection.routeId(result.shodash[0].id), 10);
  assert.equal(collection.displayNumber(result.shodash[0].id), "१०");
  assert.equal(search("610").shodash.length, 0);
});
test("every pad and collection is searchable by its actual final line", () => {
  for (const { mode } of searchCollections.filter((c) => c.mode !== "pad")) {
    const c = searchCollections.find((c) => c.mode === mode);
    for (const p of c.pads) {
      const line = p.verses.at(-1);
      if (!line) continue;
      assert(
        search(`"${line}"`)[mode].some((r) => r.id === p.id),
        `${mode} ${p.id}`,
      );
    }
  }
});
test("worker payload excludes source page geometry and preserves text", () => {
  const before = JSON.stringify(searchCollections.map((c) => c.pads));
  search("प्रेम");
  assert.equal(JSON.stringify(searchCollections.map((c) => c.pads)), before);
  for (const c of documents)
    for (const p of c.pads) {
      assert.equal(p.lines, undefined);
      assert.equal(p.blocks, undefined);
    }
});
