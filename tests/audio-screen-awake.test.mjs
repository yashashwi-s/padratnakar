import { test } from "node:test";
import assert from "node:assert/strict";
import { bindAudioScreenAwake } from "../src/lib/audio/screen-awake.js";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(acquire) {
  let state = { playing: false, intent: false },
    listener;
  const doc = new EventTarget();
  doc.hidden = false;
  const cleanup = bindAudioScreenAwake(
    {
      getSnapshot: () => state,
      subscribe(fn) {
        listener = fn;
        return () => {
          listener = () => {};
        };
      },
    },
    doc,
    acquire,
  );
  return {
    doc,
    cleanup,
    update(patch) {
      state = { ...state, ...patch };
      listener();
    },
  };
}
test("screen stays awake only during playback, not downloading, paused, hidden or unmounted", async () => {
  let acquired = 0,
    released = 0;
  const f = fixture(async () => {
    acquired++;
    return async () => {
      released++;
    };
  });
  f.update({ intent: true });
  await tick();
  assert.equal(acquired, 0);
  f.update({ playing: true });
  await tick();
  for (let current = 1; current < 30; current++) f.update({ current });
  assert.equal(acquired, 1);
  f.update({ playing: false, intent: false });
  await tick();
  assert.equal(released, 1);
  f.update({ playing: true, intent: true });
  await tick();
  f.doc.hidden = true;
  f.doc.dispatchEvent(new Event("visibilitychange"));
  await tick();
  assert.equal(released, 2);
  // Existing audio lifecycle clears intent on lock/background; return stays paused.
  f.update({ playing: false, intent: false });
  f.doc.hidden = false;
  f.doc.dispatchEvent(new Event("visibilitychange"));
  await tick();
  assert.equal(acquired, 2);
  f.update({ playing: true, intent: true });
  await tick();
  f.cleanup();
  await tick();
  assert.equal(released, 3);
});
test("late wake acquisition is released after pause or disposal", async () => {
  for (const dispose of [false, true]) {
    let complete,
      released = 0;
    const f = fixture(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    f.update({ playing: true, intent: true });
    if (dispose) f.cleanup();
    else f.update({ playing: false, intent: false });
    complete(async () => {
      released++;
    });
    await tick();
    assert.equal(released, 1);
    f.cleanup();
  }
});
test("denied wake request does not interrupt playback or retry on time ticks", async () => {
  let attempts = 0;
  const f = fixture(async () => {
    attempts++;
    throw new Error("denied");
  });
  f.update({ playing: true, intent: true });
  await tick();
  f.update({ current: 1 });
  await tick();
  assert.equal(attempts, 1);
  f.cleanup();
});
