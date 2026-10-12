import { routePath } from "../src/lib/collection-routes.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { copiedPadText, shareFooter } from "../src/lib/share-pad.js";
test("clipboard preserves devotional text and appends the same footer as native image sharing", () => {
  for (const [mode, id] of [
    ["pad", 32],
    ["shodash", 0],
    ["kallolini", 117],
    ["jayanti", 1],
  ]) {
    const text = "प्रथम पंक्ति।\nदूसरी पंक्ति॥";
    assert.equal(
      copiedPadText(text, mode, id),
      `${text}\n\n${shareFooter(mode, id)}`,
    );
    assert.ok(
      shareFooter(mode, id).includes(
        `https://padratnakar.vercel.app${routePath(mode, id)}`,
      ),
    );
    assert.ok(
      shareFooter(mode, id).endsWith(
        "पद रत्नाकर: https://padratnakar.vercel.app",
      ),
    );
  }
});

test("preparation saves the native image once and survives pinch/viewport changes", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync(
    new URL("../src/lib/share-pad.js", import.meta.url),
    "utf8",
  );
  let renders = 0,
    writes = 0;
  const code = source
    .slice(
      source.indexOf("const prepared ="),
      source.indexOf("export async function sharePad"),
    )
    .replaceAll("export ", "");
  const context = {
    Capacitor: { isNativePlatform: () => true },
    Directory: { Cache: "cache" },
    Filesystem: {
      writeFile: async () => {
        writes++;
        return { uri: "file://prepared.png" };
      },
    },
    asDataUrl: async () => "data:image/png;base64,ABC",
    padImage: async () => {
      renders++;
      return {};
    },
  };
  runInNewContext(code + "\nthis.prepare=preparePadShare;", context);
  const svg = {
    dataset: { contentHeight: "500" },
    viewBox: { baseVal: { width: 388 } },
    querySelector: () => ({ dataset: { borderIndex: "4" } }),
    querySelectorAll: () => [{ outerHTML: "<g>unchanged text</g>" }],
  };
  const first = await context.prepare(svg, "pad-32");
  svg.outerHTML = "different viewport and transform";
  const second = await context.prepare(svg, "pad-32");
  assert.equal(first, second);
  assert.equal(first.uri, "file://prepared.png");
  assert.equal(renders, 1);
  assert.equal(writes, 1);
  // An artwork-only correction must replace the pre-generated image even
  // when the text, page size and ready flag stay identical.
  svg.dataset.artReady = "true";
  svg.dataset.artRevision = "complete-lalita:10:20:86:146";
  const withArt = await context.prepare(svg, "pad-32");
  svg.dataset.artRevision = "revised-lalita:10:20:86:146";
  const revised = await context.prepare(svg, "pad-32");
  assert.notEqual(withArt, revised);
  assert.equal(renders, 3);
  assert.equal(writes, 3);
  assert.equal(await context.prepare(svg, "pad-32"), revised);
  assert.equal(renders, 3);
});

test("a share tap promotes and wakes an already queued background export without duplicating it", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync(
    new URL("../src/lib/share-pad.js", import.meta.url),
    "utf8",
  );
  const code = source
    .slice(
      source.indexOf("const prepared ="),
      source.indexOf("export async function sharePad"),
    )
    .replaceAll("export ", "");
  let renders = 0,
    writes = 0,
    work;
  const context = {
    Capacitor: { isNativePlatform: () => true },
    Directory: { Cache: "cache" },
    Filesystem: {
      writeFile: async () => {
        writes++;
        return { uri: "file://ready.png" };
      },
    },
    asDataUrl: async () => "data:image/png;base64,ABC",
    padImage: (_svg, options) => {
      renders++;
      work = options;
      return new Promise((resolve) => {
        options.resume = () => resolve({});
      });
    },
  };
  runInNewContext(code + "\nthis.prepare=preparePadShare;", context);
  const svg = {
    dataset: { contentHeight: "500" },
    viewBox: { baseVal: { width: 376 } },
    querySelector: () => null,
    querySelectorAll: () => [{ outerHTML: "<g>verse</g>" }],
  };
  const background = context.prepare(svg, "pad-10", { background: true });
  assert.equal(work.background, true);
  const tapped = context.prepare(svg, "pad-10");
  assert.equal(work.background, false);
  assert.equal(tapped, background);
  assert.equal((await tapped).uri, "file://ready.png");
  assert.equal(renders, 1);
  assert.equal(writes, 1);
  assert.equal(await context.prepare(svg, "pad-10"), await tapped);
});
