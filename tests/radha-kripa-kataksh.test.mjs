import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  radhaKripaKataksh as c,
  radhaKripaKatakshPads as pads,
  radhaKripaKatakshPage as page,
} from "../src/lib/radha-kripa-kataksh.js";
test("RKK contains all 19 Hindi translations and no Sanskrit or English layer", () => {
  assert.equal(c.stanzas.length, 19);
  assert.equal(pads.length, 1);
  assert.equal(pads[0].verses.length, 116);
  assert.deepEqual(
    c.stanzas.map((s) => s.number),
    Array.from({ length: 19 }, (_, i) => i + 1),
  );
  assert.deepEqual(
    c.stanzas.map((s) => s.sourcePage),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14, 15, 15, 15, 16],
  );
  assert.ok(pads[0].verses.every((line) => !/[a-zA-Z]/.test(line)));
  assert.ok(
    !pads[0].verses.some(
      (line) =>
        line.includes("कदा करिष्यसीह") || line.includes("ऊर्ध्वाम्नायतन्त्रे"),
    ),
  );
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "../data/collections/radha-kripa-kataksh/source/booklet.pdf",
            import.meta.url,
          ),
        ),
      )
      .digest("hex"),
    c.source.sha256,
  );
});
test("the fixed reader preserves every Hindi printed line and its source page", () => {
  const p = page(pads[0]);
  const body = p.lines.filter((l) => l.role === "verse");
  assert.deepEqual(
    body.map((l) => l.text),
    pads[0].verses,
  );
  assert.ok(body.every((l) => l.source.pdfPage >= 1 && l.source.pdfPage <= 16));
  assert.ok(body.every((l, i) => !i || l.y > body[i - 1].y));
});
