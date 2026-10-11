import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
test("Pad Ratnakar 48 retains its full source lines while all eight drawings have a separate column", () => {
  const pad = getPad(48),
    layout = JSON.parse(
      readFileSync(new URL("../public/data/layout/1.json", import.meta.url)),
    )[48];
  const base = fixedPrintModel(pad, layout),
    page = illustratedSakhiPage(base, pad, resources);
  assert.equal(page.illustrations.length, 8);
  assert.deepEqual(
    page.lines.map((l) => l.text),
    base.lines.map((l) => l.text),
  );
  assert.ok(page.illustrations.every((image) => image.x > base.width));
  assert.ok(page.lines.every((line) => line.textWidth === base.width));
  for (let i = 1; i < page.illustrations.length; i++)
    assert.ok(
      page.illustrations[i].y >
        page.illustrations[i - 1].y + page.illustrations[i - 1].height,
    );
});
