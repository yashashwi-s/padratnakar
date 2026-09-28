import { test } from "node:test";
import assert from "node:assert/strict";

test("reader font requests share pending work and retry after failure", async () => {
  let calls = 0;
  let reject;
  globalThis.document = {
    fonts: {
      load: () => {
        calls++;
        return calls === 1
          ? new Promise((_, fail) => {
              reject = fail;
            })
          : Promise.resolve([]);
      },
    },
  };
  try {
    const { loadReaderFont } = await import("../src/lib/reader-font.js");
    const first = loadReaderFont();
    assert.equal(first, loadReaderFont());
    assert.equal(calls, 1);
    reject(new Error("font unavailable"));
    await assert.rejects(first);
    await loadReaderFont();
    assert.equal(calls, 2);
    await loadReaderFont();
    assert.equal(calls, 2);
  } finally {
    delete globalThis.document;
  }
});
