import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPrintLayout } from "../src/lib/print-layout.js";

test("layout loads the right chunk, caches concurrent reads and retries failures", async () => {
  const original = globalThis.fetch;
  const requests = [];
  let fail = true;
  globalThis.fetch = async (url) => {
    requests.push(url);
    if (url.endsWith("/16.json") && fail) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () =>
        JSON.parse(
          await readFile(new URL(`../public${url}`, import.meta.url), "utf8"),
        ),
    };
  };
  try {
    assert.equal(await getPrintLayout(0), undefined);
    assert.equal(await getPrintLayout(1566), undefined);
    assert.equal(await getPrintLayout(1.5), undefined);
    assert.equal(requests.length, 0);
    const [a, b] = await Promise.all([getPrintLayout(1), getPrintLayout(100)]);
    assert.equal(a.padId, 1);
    assert.equal(b.padId, 100);
    assert.equal(requests.length, 1);
    assert.equal((await getPrintLayout(101)).padId, 101);
    await assert.rejects(getPrintLayout(1565), /503/);
    fail = false;
    assert.equal((await getPrintLayout(1565)).padId, 1565);
  } finally {
    globalThis.fetch = original;
  }
});
