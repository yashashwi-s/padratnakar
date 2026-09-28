import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";

test(
  "real worker returns only the latest queued query and stays reusable",
  { timeout: 10000 },
  async () => {
    const moduleUrl = new URL("../src/lib/search.worker.js", import.meta.url)
      .href;
    const worker = new Worker(
      `
    const {parentPort} = require('node:worker_threads');
    globalThis.self = {postMessage: (data) => parentPort.postMessage(data)};
    import(${JSON.stringify(moduleUrl)}).then(() => {
      parentPort.on('message', data => self.onmessage({data}));
      parentPort.postMessage({ready: true});
    });`,
      { eval: true },
    );
    const next = () =>
      new Promise((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
      });
    try {
      await next();
      worker.postMessage({
        type: "init",
        documents: [
          {
            mode: "pad",
            pads: [
              { id: 1, verses: ["राम"] },
              { id: 2, verses: ["श्याम"] },
            ],
          },
        ],
      });
      const result = next();
      worker.postMessage({ id: 1, query: "राम" });
      worker.postMessage({ id: 2, query: "श्याम" });
      let received = await result;
      // Delivery may run a first timer before the next message reaches the worker.
      if (received.id === 1) received = await next();
      assert.equal(received.id, 2);
      assert.deepEqual(
        received.results.pad.map((r) => r.id),
        [2],
      );
      const repeated = next();
      worker.postMessage({ id: 3, query: "१" });
      assert.equal((await repeated).results.pad[0].id, 1);
    } finally {
      await worker.terminate();
    }
  },
);
