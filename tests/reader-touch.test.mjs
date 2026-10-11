import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("pinch frames only transform; dimensions and scroll settle once on release", () => {
  const events = {},
    writes = [],
    reads = [],
    scrolls = [];
  let frame;
  const node = (name) => ({
    style: {
      setProperty: (key, value) => writes.push([name, key, value]),
      removeProperty() {},
    },
    getBoundingClientRect() {
      reads.push(name);
      return { left: 0, top: 100 };
    },
  });
  const svg = node("svg"),
    canvas = node("canvas");
  const element = {
    querySelector: (s) => (s === "svg" ? svg : canvas),
    setAttribute() {},
    addEventListener: (name, callback) => {
      events[name] = callback;
    },
    removeEventListener() {},
    scrollBy: (value) => scrolls.push(value),
  };
  const source = readFileSync(
    new URL("../src/lib/use-reader-touch.js", import.meta.url),
    "utf8",
  )
    .replace(/import[^;]+;/, "")
    .replaceAll("export ", "");
  runInNewContext(
    source + "\nuseReaderTouch({current:element},()=>{},390,1000,true);",
    {
      element,
      useRef: (current) => ({ current }),
      useLayoutEffect: (fn) => fn(),
      setTimeout,
      clearTimeout,
      requestAnimationFrame: (fn) => {
        frame = fn;
        return 1;
      },
      cancelAnimationFrame: () => {},
      window: { scrollBy: (value) => scrolls.push(value) },
    },
  );
  const event = (points) => ({
    touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
    cancelable: true,
    preventDefault() {},
  });
  events.touchstart(
    event([
      [100, 200],
      [200, 200],
    ]),
  );
  writes.length = reads.length = scrolls.length = 0;
  events.touchmove(
    event([
      [50, 200],
      [250, 200],
    ]),
  );
  frame();
  assert.equal(reads.length, 0);
  assert.equal(scrolls.length, 0);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], [
    "svg",
    "transform",
    "translate(-150px, -100px) scale(2)",
  ]);
  events.touchend(event([]));
  assert.deepEqual(reads, ["canvas"]);
  assert.equal(scrolls.length, 2);
  assert.ok(
    writes.some(
      ([name, key, value]) =>
        name === "canvas" && key === "width" && value === "780px",
    ),
  );
});
