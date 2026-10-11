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
      assert(!/undefined|NaN|Infinity|<text|<script/.test(markup));
      assert.equal((markup.match(/<image /g) || []).length, 6);
      assert.equal((markup.match(/<pattern /g) || []).length, 2);
      const patterns = [...markup.matchAll(/<pattern[^>]+width="([^"]+)"/g)];
      for (const [j, length] of [388 - 52, height - 52].entries()) {
        const repeats = length / Number(patterns[j][1]);
        assert.ok(Math.abs(repeats - Math.round(repeats)) < 1e-8);
      }
      assert(!/href="(?!#|data:image\/svg\+xml,)/.test(markup));
      const long = readerBorderMarkup(i, 388, 30000, `page-${i}`);
      assert.equal(
        (long.match(/<[a-z]+\b/g) || []).length,
        (markup.match(/<[a-z]+\b/g) || []).length,
      );
    }
  }
});
