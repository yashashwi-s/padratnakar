import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readerBorders,
  readerBorderIndex,
  readerBorderMarkup,
} from "../src/lib/reader-borders.js";

test("every collection cycles through all approved borders without changing on revisit", () => {
  assert.equal(readerBorders.length, 25);
  assert.equal(new Set(readerBorders.map((border) => border.name)).size, 25);
  for (const collection of ["pad", "shodash", "jayanti", "kallolini"]) {
    const first = Array.from({ length: 25 }, (_, i) =>
      readerBorderIndex(collection, i),
    );
    assert.equal(new Set(first).size, 25);
    assert.deepEqual(
      Array.from({ length: 25 }, (_, i) =>
        readerBorderIndex(collection, i + 25),
      ),
      first,
    );
    assert.notEqual(first[0], first.at(-1));
  }
});

test("all border families export with self-contained SVG references and no external assets", () => {
  for (let i = 0; i < readerBorders.length; i++) {
    for (const height of [500, 3000]) {
      const markup = readerBorderMarkup(i, 388, height, `page-${i}`);
      const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length);
      const references = [
        ...[...markup.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]),
        ...[...markup.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]),
      ];
      assert(
        references.every((id) => ids.includes(id)),
        readerBorders[i].name,
      );
      assert.match(markup, /clip-rule="evenodd"/);
      assert(
        !/undefined|NaN|Infinity|<image|<text|https?:|<script/.test(markup),
      );
      // Two edge definitions serve all four sides, even on very long pads.
      assert.equal(
        ids.filter((id) => /-horizontal$|-vertical$/.test(id)).length,
        2,
      );
    }
  }
});
