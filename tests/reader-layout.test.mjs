import { test } from "node:test";
import assert from "node:assert/strict";
import { swipeDirection, wrappedPosition } from "../src/lib/reader-layout.js";

test("swipes advance left and go back right; reject scrolls, taps, selection and pinch", () => {
  const start = { x: 200, y: 100, time: 100 };
  assert.equal(swipeDirection(start, { x: 100, y: 110, time: 300 }), 1);
  assert.equal(swipeDirection(start, { x: 300, y: 110, time: 300 }), -1);
  for (const end of [
    { x: 180, y: 100, time: 300 },
    { x: 100, y: 170, time: 300 },
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

test("short deliberate flicks work without requiring a long drag", () => {
  const start = { x: 200, y: 100, time: 100 };
  assert.equal(swipeDirection(start, { x: 170, y: 104, time: 240 }), 1);
  assert.equal(swipeDirection(start, { x: 230, y: 104, time: 240 }), -1);
  assert.equal(swipeDirection(start, { x: 170, y: 104, time: 650 }), 0);
  assert.equal(swipeDirection(start, { x: 155, y: 104, time: 650 }), 1);
  assert.equal(swipeDirection(start, { x: 170, y: 120, time: 240 }), 0);
});

test("both navigation directions wrap at collection boundaries", () => {
  for (const count of [1565, 18]) {
    assert.equal(wrappedPosition(0, -1, count), count - 1);
    assert.equal(wrappedPosition(count - 1, 1, count), 0);
    assert.equal(wrappedPosition(0, 1, count), 1);
    assert.equal(wrappedPosition(4, -1, count), 3);
  }
});

test("very fast deliberate flicks are not rejected by an artificial minimum duration", () => {
  assert.equal(
    swipeDirection(
      { x: 200, y: 100, time: 100 },
      { x: 155, y: 102, time: 120 },
    ),
    1,
  );
});
