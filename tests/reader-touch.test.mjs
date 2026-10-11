import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function fixture() {
  const events = {},
    writes = [],
    reads = [],
    scrolls = [],
    attributes = {};
  let frame;
  let rects = {};
  const node = (name) => ({
    style: {
      setProperty: (key, value) => writes.push([name, key, value]),
      removeProperty() {},
    },
    getBoundingClientRect() {
      reads.push(name);
      return rects[name] || { left: 0, top: 100, right: 390, bottom: 1100 };
    },
  });
  const surface = node("surface"),
    canvas = node("canvas");
  const element = {
    ...node("viewport"),
    querySelector: (s) => (s === ".print-surface" ? surface : canvas),
    setAttribute: (key, value) => (attributes[key] = value),
    addEventListener: (name, fn) => (events[name] = fn),
    removeEventListener() {},
    scrollBy: (value) => scrolls.push(value),
    scrollLeft: 0,
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
      window: { innerHeight: 800, scrollBy: (value) => scrolls.push(value) },
    },
  );
  const touch = (name, points) =>
    events[name]({
      type: name,
      touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
      cancelable: true,
      preventDefault() {},
    });
  const clear = () => {
    writes.length = reads.length = scrolls.length = 0;
  };
  return {
    touch,
    setRects: (value) => {
      rects = value;
    },
    clear,
    writes,
    reads,
    scrolls,
    attributes,
    paint: () => frame?.(),
  };
}
test("pinch frames only transform the HTML surface, then dimensions and scroll settle on release", () => {
  const f = fixture();
  f.touch("touchstart", [
    [100, 200],
    [200, 200],
  ]);
  f.clear();
  f.touch("touchmove", [
    [50, 200],
    [250, 200],
  ]);
  f.paint();
  assert.equal(f.reads.length, 0);
  assert.equal(f.scrolls.length, 0);
  assert.deepEqual(f.writes, [
    ["surface", "transform", "translate3d(-150px, -100px, 0) scale(2)"],
  ]);
  f.touch("touchend", []);
  assert.deepEqual(f.reads, ["canvas"]);
  assert.equal(f.scrolls.length, 2);
  assert.ok(
    f.writes.some(
      ([n, k, v]) => n === "canvas" && k === "width" && v === "780px",
    ),
  );
  assert.equal(f.attributes["data-pinching"], "false");
});
test("two fingers moving together at fitted size cannot displace the pad or scroll it", () => {
  const f = fixture();
  f.touch("touchstart", [
    [100, 200],
    [200, 200],
  ]);
  f.clear();
  f.touch("touchmove", [
    [200, 500],
    [300, 500],
  ]);
  f.paint();
  assert.equal(f.writes[0][2], "translate3d(0px, 0px, 0) scale(1)");
  f.touch("touchend", []);
  assert.equal(f.scrolls.length, 0);
  assert.equal(f.attributes["data-zoom"], "1");
});
test("pinch panning stays inside page bounds and cancellation always settles the surface", () => {
  const f = fixture();
  f.touch("touchstart", [
    [100, 200],
    [200, 200],
  ]);
  f.clear();
  f.touch("touchmove", [
    [900, 1000],
    [1100, 1000],
  ]);
  f.paint();
  assert.equal(f.writes[0][2], "translate3d(0px, 0px, 0) scale(2)");
  f.touch("touchcancel", [
    [900, 1000],
    [1100, 1000],
  ]);
  assert.equal(f.attributes["data-pinching"], "false");
  assert.ok(
    f.writes.some(
      ([n, k, v]) =>
        n === "surface" &&
        k === "transform" &&
        v === "translate3d(0, 0, 0) scale(2)",
    ),
  );
});

test("zoomed one-finger drags move both axes together, coalesce frames and need no geometry reads", () => {
  const f = fixture();
  f.touch("touchstart", [
    [100, 200],
    [200, 200],
  ]);
  f.touch("touchmove", [
    [50, 200],
    [250, 200],
  ]);
  f.paint();
  f.touch("touchend", []);
  f.touch("touchstart", [[200, 400]]);
  f.clear();
  f.touch("touchmove", [[180, 370]]);
  f.touch("touchmove", [[160, 340]]);
  assert.equal(f.scrolls.length, 0);
  f.paint();
  assert.equal(f.reads.length, 0);
  assert.deepEqual(
    f.scrolls.map((s) => [s.left, s.top]),
    [
      [40, 0],
      [0, 60],
    ],
  );
  f.touch("touchend", []);
  assert.equal(f.attributes["data-pinching"], "false");
});
test("lifting one pinch finger continues into diagonal panning without another touch", () => {
  const f = fixture();
  f.touch("touchstart", [
    [100, 200],
    [200, 200],
  ]);
  f.touch("touchmove", [
    [50, 200],
    [250, 200],
  ]);
  f.paint();
  f.touch("touchend", [[250, 200]]);
  f.clear();
  f.touch("touchmove", [[230, 170]]);
  f.paint();
  assert.deepEqual(
    f.scrolls.map((s) => [s.left, s.top]),
    [
      [20, 0],
      [0, 30],
    ],
  );
  assert.equal(f.reads.length, 0);
  f.touch("touchcancel", []);
  assert.equal(f.attributes["data-pinching"], "false");
});

for (const ending of ["touchend", "touchcancel"]) {
  test(`zooming fully out from a scrolled page keeps content visible on ${ending}`, () => {
    const f = fixture();
    f.touch("touchstart", [
      [100, 200],
      [200, 200],
    ]);
    f.touch("touchmove", [
      [0, 200],
      [300, 200],
    ]);
    f.paint();
    f.touch("touchend", []);
    // At 3× the reader has been panned far down and to the right.
    f.setRects({
      canvas: { left: -300, top: -1500, right: 870, bottom: 1500 },
      surface: { left: -300, top: -1500, right: 870, bottom: 1500 },
      viewport: { left: 0, top: -1500, right: 390, bottom: 1500 },
    });
    f.touch("touchstart", [
      [0, 300],
      [300, 300],
    ]);
    f.clear();
    f.touch("touchmove", [
      [100, 300],
      [200, 300],
    ]);
    f.paint();
    assert.equal(f.reads.length, 0);
    assert.equal(f.writes.at(-1)[2], "translate3d(300px, 1300px, 0) scale(1)");
    f.touch(ending, []);
    assert.equal(f.attributes["data-zoom"], "1");
    assert.equal(f.attributes["data-pinching"], "false");
    assert.deepEqual(
      f.scrolls.map((s) => [s.left, s.top]),
      [[0, -1300]],
    );
    // Repeat a fitted-size gesture: no residual pan or stale movement.
    f.clear();
    f.touch("touchstart", [
      [100, 200],
      [200, 200],
    ]);
    f.touch("touchmove", [
      [150, 250],
      [250, 250],
    ]);
    f.paint();
    f.touch("touchend", []);
    assert.equal(f.scrolls.length, 0);
  });
}
