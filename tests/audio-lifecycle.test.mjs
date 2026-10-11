import { test } from "node:test";
import assert from "node:assert/strict";
import { bindAudioLifecycle } from "../src/lib/audio/lifecycle.js";
const tick = () => new Promise((resolve) => setImmediate(resolve));
test("native and document visibility both gate playback; stale initial state cannot override background", async () => {
  const document = new EventTarget();
  document.hidden = false;
  document.defaultView = new EventTarget();
  const states = [];
  let notify,
    initial,
    removed = false;
  const cleanup = bindAudioLifecycle(
    { setActive: (value) => states.push(value) },
    document,
    {
      addListener: (name, callback) => {
        assert.equal(name, "appStateChange");
        notify = callback;
        return Promise.resolve({
          remove: () => {
            removed = true;
          },
        });
      },
      getState: () =>
        new Promise((resolve) => {
          initial = resolve;
        }),
    },
  );
  assert.equal(states.at(-1), false);
  notify({ isActive: false });
  initial({ isActive: true });
  await tick();
  assert.equal(states.at(-1), false);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  notify({ isActive: true });
  assert.equal(states.at(-1), false);
  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(states.at(-1), true);
  cleanup();
  assert.equal(removed, true);
  const count = states.length;
  notify({ isActive: false });
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(states.length, count);
});
