import { test } from "node:test";
import assert from "node:assert/strict";
import { swipeDirection } from "../src/lib/reader-layout.js";

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
