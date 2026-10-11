import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { illustratedSakhiPage } from "../src/lib/sakhi-layout.js";
import { kalloliniPads, kalloliniPage } from "../src/lib/kallolini.js";
import { getPad } from "../src/lib/corpus.js";
import { fixedPrintModel } from "../src/lib/fixed-print.js";
const metadata = JSON.parse(
  readFileSync(
    new URL(
      "../data/collections/mahabhav-kallolini/illustrations.json",
      import.meta.url,
    ),
  ),
);
const resources = metadata.map((item) => ({
  ...item,
  href: `data:image/png;base64,${readFileSync(new URL(`../data/collections/mahabhav-kallolini/art/${item.id}.png`, import.meta.url)).toString("base64")}`,
}));

test("both editions use identical complete source drawings at their original proportions", () => {
  const pad = getPad(48);
  const layout = JSON.parse(
    readFileSync(new URL("../public/data/layout/1.json", import.meta.url)),
  )[48];
  const ratnakar = illustratedSakhiPage(
    fixedPrintModel(pad, layout),
    pad,
    resources,
  );
  const kallolini = illustratedSakhiPage(
    kalloliniPage(kalloliniPads[7]),
    kalloliniPads[7],
    resources,
  );
  for (let i = 0; i < resources.length; i++) {
    const png = readFileSync(
      new URL(
        `../data/collections/mahabhav-kallolini/art/${resources[i].id}.png`,
        import.meta.url,
      ),
    );
    assert.equal(
      createHash("sha256").update(png).digest("hex"),
      resources[i].sha256,
    );
    const ratio = png.readUInt32BE(16) / png.readUInt32BE(20);
    for (const page of [ratnakar, kallolini]) {
      const image = page.illustrations[i];
      assert.ok(Math.abs(image.width / image.height - ratio) < 1e-10);
      assert.equal(image.href, resources[i].href);
      assert.equal(image.sha256, resources[i].sha256);
      assert.ok(image.y > 0 && image.y + image.height < page.height);
    }
  }
});

test("all eight original drawings fit the illustrated Kallolini source columns without intersecting text", () => {
  const pad = kalloliniPads[7],
    base = kalloliniPage(pad),
    page = illustratedSakhiPage(base, pad, resources);
  assert.equal(page.illustrations.length, 8);
  assert.deepEqual(
    page.lines.map((l) => l.text),
    base.lines.map((l) => l.text),
  );
  for (const image of page.illustrations) {
    assert.ok(image.x >= 0 && image.x + image.width <= page.width);
    assert.ok(image.y >= 0 && image.y + image.height < page.height);
    for (const line of page.lines.filter((l) => l.role === "verse")) {
      const overlaps =
        image.x < line.x + line.fitWidth &&
        image.x + image.width > line.x &&
        image.y < line.y &&
        image.y + image.height > line.y - line.fontSize;
      assert.equal(overlaps, false, `${image.name}: ${line.text}`);
    }
  }
});
test("Pad Ratnakar 48 alternates drawings and preserves every original word", () => {
  const pad = getPad(48),
    layout = JSON.parse(
      readFileSync(new URL("../public/data/layout/1.json", import.meta.url)),
    )[48];
  const base = fixedPrintModel(pad, layout),
    page = illustratedSakhiPage(base, pad, resources);
  assert.equal(page.width, base.width);
  assert.equal(page.illustrations.length, 8);
  const normalize = (text) => text.replace(/\s/g, "");
  assert.equal(
    normalize(page.lines.map((l) => l.text).join("")),
    normalize(base.lines.map((l) => l.text).join("")),
  );
  for (let index = 0; index < 32; index++) {
    const parts = page.lines.filter((line) => line.canonicalLine === index);
    assert.equal(parts.length, 2);
    assert.ok(parts.every((part) => part.text.length > 0 && part.source));
  }
  for (const [index, image] of page.illustrations.entries()) {
    assert.equal(image.x < page.width / 2, index % 2 === 0);
    assert.ok(image.x >= 0 && image.x + image.width <= page.width);
    for (const line of page.lines.filter((l) => l.role === "verse")) {
      const overlaps =
        image.x < line.x + line.fitWidth &&
        image.x + image.width > line.x &&
        image.y < line.y &&
        image.y + image.height > line.y - line.fontSize;
      assert.equal(overlaps, false, image.name + ": " + line.text);
    }
  }
});
