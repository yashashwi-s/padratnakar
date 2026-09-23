import { test } from "node:test";
import assert from "node:assert/strict";
import { fitLine, swipeDirection } from "../src/lib/reader-layout.js";

test("line wrapping uses the entire available width at large font or narrow screen", () => {
  const base = {
    width: 400,
    naturalWidth: 450,
    fontSize: 32,
    inset: 0.2,
    extent: 0.8,
    groups: 4,
    words: 8,
  };
  assert.deepEqual(fitLine(base), { mode: "flow", indent: 0, fraction: 1 });
  assert.equal(fitLine({ ...base, width: 750 }).mode, "groups");
  assert.equal(
    fitLine({ ...base, width: 750, naturalWidth: 900 }).mode,
    "flow",
  );
});
test("short lines never expand into huge word gaps", () => {
  assert.equal(
    fitLine({
      width: 700,
      naturalWidth: 150,
      fontSize: 20,
      words: 4,
      groups: 2,
    }).mode,
    "aligned",
  );
  assert.equal(
    fitLine({
      width: 400,
      naturalWidth: 360,
      fontSize: 20,
      words: 8,
      groups: 1,
    }).mode,
    "justify",
  );
});
test("centering and citations preserve their roles without constraining wrapped lines", () => {
  assert.equal(
    fitLine({ width: 300, naturalWidth: 150, fontSize: 20, centered: true })
      .mode,
    "center",
  );
  assert.equal(
    fitLine({ width: 300, naturalWidth: 400, fontSize: 35, centered: true })
      .mode,
    "flow",
  );
  assert.equal(
    fitLine({ width: 300, naturalWidth: 120, fontSize: 16, citation: true })
      .mode,
    "citation",
  );
});
test("swipes advance left and go back right; reject scrolls, taps, selection and pinch", () => {
  const start = { x: 200, y: 100, time: 100 };
  assert.equal(swipeDirection(start, { x: 100, y: 110, time: 300 }), 1);
  assert.equal(swipeDirection(start, { x: 300, y: 110, time: 300 }), -1);
  for (const end of [
    { x: 160, y: 100, time: 300 },
    { x: 100, y: 170, time: 300 },
    { x: 100, y: 100, time: 110 },
    { x: 100, y: 100, time: 1000 },
  ])
    assert.equal(swipeDirection(start, end), 0);
  assert.equal(
    swipeDirection(start, { x: 100, y: 100, time: 300 }, { selection: true }),
    0,
  );
  assert.equal(
    swipeDirection(start, { x: 100, y: 100, time: 300 }, { scale: 2 }),
    0,
  );
  assert.equal(swipeDirection(null, { x: 100, y: 100, time: 300 }), 0);
});
