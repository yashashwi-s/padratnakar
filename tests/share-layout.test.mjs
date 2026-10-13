import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { waitForShareLayout } from "../src/lib/share-layout.js";

const source = readFileSync(
  new URL("../src/lib/share-pad.js", import.meta.url),
  "utf8",
);
function sharing(native, svg) {
  const calls = [];
  const context = {
    Capacitor: { isNativePlatform: () => native },
    waitForShareLayout,
    loadReaderFont: async () => calls.push("font"),
    fitReaderText: () => calls.push("fit"),
    preparePadShare: async () => ({ uri: "file://pad.png" }),
    shareFooter: () => "canonical link",
    copiedPadText: (text) => text + "\ncanonical link",
    Share: { share: async (options) => calls.push(options) },
    navigator: { share: async (options) => calls.push(options) },
    requestAnimationFrame: () => {
      throw new Error("Share must not wait for WebView frames");
    },
  };
  const code = source
    .slice(
      source.indexOf("export async function sharePad"),
      source.indexOf("export async function copyPad"),
    )
    .replace("export ", "");
  runInNewContext(code + "\nthis.share=sharePad;", context);
  return { calls, tap: () => context.share(svg, "pad", 1) };
}

test("one cold native share tap waits for lazy layout and opens the image sheet without any frames or second input", async () => {
  const svg = {
    isConnected: true,
    dataset: { shareReady: "false" },
    querySelectorAll: () => [],
  };
  const f = sharing(true, svg);
  const pending = f.tap();
  assert.equal(f.calls.length, 0);
  svg.dataset.shareReady = "true";
  assert.equal(await pending, "shared");
  assert.deepEqual(f.calls.slice(0, 2), ["font", "fit"]);
  assert.equal(f.calls[2].files[0], "file://pad.png");
  assert.equal(f.calls[2].text, "canonical link");
});

test("native sharing of a ready page needs no animation frame", async () => {
  const f = sharing(true, {
    isConnected: true,
    dataset: { shareReady: "true" },
    querySelectorAll: () => [],
  });
  assert.equal(await f.tap(), "shared");
  assert.equal(f.calls.length, 3);
});

test("web sharing is called synchronously in the original tap and sends text with the link", async () => {
  const f = sharing(false, {
    dataset: { shareReady: "false" },
    querySelectorAll: () => [{ textContent: "पद का पाठ" }],
  });
  const pending = f.tap();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].text, "पद का पाठ\ncanonical link");
  assert.equal(f.calls[0].files, undefined);
  assert.equal(await pending, "shared");
});

test("waiting for a changed or failed page rejects instead of sharing a fallback page", async () => {
  await assert.rejects(
    waitForShareLayout({ isConnected: false, dataset: {} }),
    /Reader page changed/,
  );
  await assert.rejects(
    waitForShareLayout({ isConnected: true, dataset: {} }, 0),
    /Reader layout is not ready/,
  );
});
