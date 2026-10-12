import { test } from "node:test";
import assert from "node:assert/strict";
import { captureShareText, drawShareText } from "../src/lib/share-canvas.js";

test("canvas export captures positioned full text and raised markers in page coordinates", () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 44, f: 40 };
  const make = (value, x, y, size = "15px") => ({
    textContent: value,
    getStartPositionOfChar: () => ({ x, y }),
    style: { fontWeight: "700", fontSize: size, wordSpacing: "2px" },
  });
  const heading = {
    ...make("श्रीराधा", 70, 24, "13px"),
    getCTM: () => matrix,
    querySelectorAll: () => [],
  };
  const spans = [make("पद के चरण", 26, 84), make("१", 140, 78, "9px")];
  const line = { getCTM: () => matrix, querySelectorAll: () => spans };
  const svg = {
    getCTM: () => ({ inverse: () => ({ multiply: (m) => m }) }),
    querySelectorAll: () => [heading, line],
  };
  const runs = captureShareText(svg, (run) => run.style);
  assert.deepEqual(
    runs.map((r) => [r.text, r.x, r.y]),
    [
      ["श्रीराधा", 70, 24],
      ["पद के चरण", 26, 84],
      ["१", 140, 78],
    ],
  );
  assert.equal(runs[2].font, '700 9px "Noto Serif Devanagari"');
  assert.deepEqual(runs[0].matrix, [1, 0, 0, 1, 44, 40]);
});

test("canvas preserves Devanagari words, explicit word spacing and transforms without wrapping", () => {
  const calls = [];
  const ctx = {
    save() {},
    restore() {},
    transform(...m) {
      calls.push(["matrix", m]);
    },
    fillText(t, x, y) {
      calls.push([t, x, y]);
    },
    measureText(t) {
      return { width: t.length * 5 };
    },
  };
  drawShareText(ctx, [
    {
      text: "श्रीकृष्ण  चरण",
      x: 26,
      y: 84,
      matrix: [1, 0, 0, 1, 44, 40],
      font: "700 15px serif",
      wordSpacing: 2,
    },
  ]);
  assert.equal(calls[1][0], "श्रीकृष्ण");
  assert.equal(calls.at(-1)[0], "चरण");
  assert.equal(calls.at(-1)[1], 26 + "श्रीकृष्ण  ".length * 5 + 4);
  assert.equal(calls.at(-1)[2], 84);
});
