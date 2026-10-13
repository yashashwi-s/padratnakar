import { test } from "node:test";
import assert from "node:assert/strict";
import { downloadAndroidAudio } from "../src/lib/audio/native-download.js";

const track = { id: 1, bytes: 1000, sha256: "a".repeat(64) };
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  let progress, complete, reject, request;
  const cancelled = [];
  let removed = 0;
  const plugin = {
    async addListener(_name, fn) {
      progress = fn;
      return { remove: async () => removed++ };
    },
    download(options) {
      request = options;
      return new Promise((resolve, fail) => {
        complete = resolve;
        reject = fail;
      });
    },
    async cancel(options) {
      cancelled.push(options.requestId);
    },
  };
  const abort = new AbortController();
  const updates = [];
  const result = downloadAndroidAudio(
    track,
    {
      signal: abort.signal,
      onProgress: (value) => updates.push(value),
    },
    plugin,
  );
  return {
    result,
    abort,
    updates,
    cancelled,
    get removed() {
      return removed;
    },
    get request() {
      return request;
    },
    report(bytes, requestId = request.requestId) {
      progress({ bytes, requestId });
    },
    finish() {
      complete({ uri: "file:///recording.mp3" });
    },
    fail() {
      reject(new Error("host unavailable"));
    },
  };
}

test("native audio transfers metadata, filters stale progress and returns only the saved file URL", async () => {
  const f = fixture();
  await tick();
  assert.deepEqual(Object.keys(f.request).sort(), [
    "bytes",
    "id",
    "requestId",
    "sha256",
  ]);
  f.report(900, "other request");
  f.report(500);
  f.report(1000);
  assert.deepEqual(f.updates, [0.5, 0.99]);
  f.finish();
  assert.equal((await f.result).url, "file:///recording.mp3");
  assert.deepEqual(f.updates, [0.5, 0.99, 1]);
  assert.equal(f.removed, 1);
  f.abort.abort();
  assert.equal(f.cancelled.length, 0);
});

test("cancel stops the native request and a late result cannot become playable", async () => {
  const f = fixture();
  await tick();
  const rejection = assert.rejects(f.result, { name: "AbortError" });
  f.abort.abort();
  assert.deepEqual(f.cancelled, [f.request.requestId]);
  f.report(600);
  f.finish();
  await rejection;
  assert.deepEqual(f.updates, []);
  assert.equal(f.removed, 1);
});

test("failed native transfers release the progress listener", async () => {
  const f = fixture();
  await tick();
  f.fail();
  await assert.rejects(f.result, /host unavailable/);
  assert.equal(f.removed, 1);
});

test("cancellation while adding a listener never starts a native transfer", async () => {
  const abort = new AbortController();
  let listen,
    started = 0,
    removed = 0;
  const result = downloadAndroidAudio(
    track,
    {
      signal: abort.signal,
      onProgress: () => {},
    },
    {
      addListener: () =>
        new Promise((resolve) => {
          listen = resolve;
        }),
      download: () => {
        started++;
      },
    },
  );
  const rejection = assert.rejects(result, { name: "AbortError" });
  abort.abort();
  listen({
    remove: async () => {
      removed++;
    },
  });
  await rejection;
  assert.equal(started, 0);
  assert.equal(removed, 1);
});
