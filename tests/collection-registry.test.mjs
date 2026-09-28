import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectionBookmark,
  collectionPad,
  readerCollections,
} from "../src/lib/reader-collections.js";
import { routePath, validRoute } from "../src/lib/collection-routes.js";
import { searchCollections } from "../src/lib/search-catalog.js";

test("reader collection registry contains navigation and rendering metadata", () => {
  for (const [mode, collection] of Object.entries(readerCollections)) {
    assert.equal(typeof collection.page, "function", mode);
    assert(Array.isArray(collection.sections), mode);
    assert.equal(collectionPad(mode, collection.firstId), collection.pads[0]);
    assert.equal(
      collection.padById.get(collection.firstId),
      collection.pads[0],
    );
  }
  assert.deepEqual(
    readerCollections.jayanti.shortcuts.map((pad) => pad.id),
    [16, 17, 18],
  );
  assert.equal(readerCollections.kallolini.shortcuts, undefined);
});

test("bookmarks use registered collection keys and reject malformed values", () => {
  for (const [mode, collection] of Object.entries(readerCollections)) {
    const bookmark = collectionBookmark(`${mode}:${collection.firstId}`);
    assert.equal(bookmark.mode, mode);
    assert.equal(bookmark.pad, collection.pads[0]);
    assert.equal(bookmark.title, collection.title);
  }
  assert.equal(collectionBookmark("unknown:1"), null);
  assert.equal(collectionBookmark("jayanti:1extra"), null);
  assert.equal(collectionBookmark("jayanti:-1"), null);
});

test("production route helpers support canonical and registered routes", () => {
  assert.equal(routePath("pad", 1), "/pad/1");
  assert.deepEqual(validRoute("#/pad/1"), { mode: "pad", id: 1 });
  assert.deepEqual(validRoute("/shodash/0/"), { mode: "shodash", id: 0 });
  for (const [mode, collection] of Object.entries(readerCollections)) {
    assert.equal(
      routePath(mode, collection.firstId),
      `/${mode}/${collection.firstId}`,
    );
    assert.deepEqual(validRoute(`/${mode}/${collection.firstId}`), {
      mode,
      id: collection.firstId,
    });
  }
  assert.equal(validRoute("/pad/0"), null);
  assert.equal(validRoute("/shodash/999"), null);
  assert.equal(validRoute("/unknown/1"), null);
});

test("search collection entries are derived from the reader registry", () => {
  for (const [mode, collection] of Object.entries(readerCollections)) {
    const searchCollection = searchCollections.find(
      (entry) => entry.mode === mode,
    );
    assert.equal(searchCollection.name, collection.title);
    assert.equal(searchCollection.pads, collection.pads);
    assert.equal(searchCollection.sections, collection.sections);
  }
});

test("collection registry maintains stable unique IDs, source numbering and page shapes", () => {
  for (const [mode, collection] of Object.entries(readerCollections)) {
    assert.equal(collection.padById.size, collection.pads.length, mode);
    collection.pads.forEach((pad, index) => {
      assert.equal(collection.indexById.get(pad.id), index);
      assert.equal(pad.collection, mode);
      assert(Array.isArray(pad.verses));
      const page = collection.page(pad);
      assert(page.width > 0 && page.height > 0, `${mode}/${pad.id}`);
      assert(
        page.lines.every(
          (line) => typeof line.text === "string" && Number.isFinite(line.y),
        ),
      );
      assert.deepEqual(validRoute(routePath(mode, pad.id)), {
        mode,
        id: pad.id,
      });
    });
    for (const shortcut of collection.shortcuts || [])
      assert(collection.padById.has(shortcut.id));
  }
});
