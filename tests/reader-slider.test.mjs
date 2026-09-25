import { test } from "node:test";
import assert from "node:assert/strict";
import { createReaderSlider } from "../src/lib/reader-slider.js";

function fixture() {
  const styles = new Map(),
    motions = [],
    steps = [],
    panelStyles = new Map([["padding-top", "4px"]]);
  const panels = [
    {
      style: {
        setProperty: (k, v) => panelStyles.set(k, v),
        removeProperty: (k) => panelStyles.delete(k),
      },
    },
  ];
  const track = {
    clientWidth: 400,
    clientHeight: 800,
    style: {
      setProperty: (k, v) => styles.set(k, v),
      removeProperty: (k) => styles.delete(k),
    },
    querySelectorAll: () => panels,
    animate(frames, options) {
      let resolve;
      const motion = {
        finished: new Promise((r) => (resolve = r)),
        cancel() {},
        finish: () => resolve(),
        frames,
        options,
      };
      motions.push(motion);
      return motion;
    },
  };
  let visible = -160;
  const slider = createReaderSlider({
    element: () => track,
    commit: (d) => {
      steps.push(d);
      slider.reset();
    },
    scrollY: () => 0,
    viewportHeight: () => 800,
    reducedMotion: () => false,
    translateX: () => visible,
  });
  return {
    slider,
    styles,
    motions,
    steps,
    panelStyles,
    setVisible: (x) => (visible = x),
  };
}
test("rapid repeated swipes take over at the same visual position and commit once each", async () => {
  const f = fixture();
  f.slider.prepare();
  f.slider.drag(-70);
  f.slider.slide(1, 3);
  assert.equal(f.slider.prepare(), true);
  assert.deepEqual(f.steps, [1]);
  assert.equal(f.styles.get("transform"), "translate3d(240px,0,0)");
  f.slider.drag(-50);
  assert.equal(f.styles.get("transform"), "translate3d(190px,0,0)");
  f.slider.slide(1, 4);
  f.motions[0].finish();
  await Promise.resolve();
  assert.deepEqual(f.steps, [1]);
  f.motions[1].finish();
  await Promise.resolve();
  assert.deepEqual(f.steps, [1, 1]);
  assert.equal(f.styles.has("transform"), false);
});
test("reverse flick during settling returns to the preceding page without stale commits", async () => {
  const f = fixture();
  f.slider.slide(1);
  f.slider.prepare();
  f.slider.drag(80);
  f.slider.slide(-1, 3);
  f.motions[1].finish();
  f.motions[0].finish();
  await Promise.resolve();
  assert.deepEqual(f.steps, [1, -1]);
});
test("tap needs no settling animation and cancelled navigation cannot finish later", async () => {
  const f = fixture();
  f.slider.prepare();
  f.slider.slide(0);
  assert.equal(f.motions.length, 0);
  f.slider.slide(1);
  f.slider.reset();
  f.motions[0].finish();
  await Promise.resolve();
  assert.deepEqual(f.steps, []);
});
test("rapid buttons are accepted while the previous transition is running", async () => {
  const f = fixture();
  f.slider.slide(1);
  f.slider.slide(1);
  f.motions[1].finish();
  await Promise.resolve();
  assert.deepEqual(f.steps, [1, 1]);
  assert.ok(f.motions.every((m) => m.options.duration <= 180));
});

test("touch preparation never increases document height or replaces source padding", () => {
  const f = fixture();
  f.slider.prepare();
  assert.equal(f.styles.has("min-height"), false);
  assert.equal(f.panelStyles.get("padding-top"), "4px");
  f.slider.reset();
  assert.equal(f.panelStyles.get("padding-top"), "4px");
  assert.equal(f.panelStyles.has("translate"), false);
});
