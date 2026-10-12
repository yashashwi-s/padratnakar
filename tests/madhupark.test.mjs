import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  madhupark,
  madhuparkPads,
  madhuparkPage,
} from "../src/lib/madhupark.js";

const root = new URL("../data/collections/madhupark/", import.meta.url);

test("Madhupark preserves the supplied scan and 55 consecutively numbered pads", () => {
  const source = new URL("source/booklet.pdf", root);
  assert.match(madhupark.source.sha256, /^[a-f0-9]{64}$/);
  if (existsSync(source))
    assert.equal(
      createHash("sha256").update(readFileSync(source)).digest("hex"),
      madhupark.source.sha256,
    );
  assert.deepEqual(
    madhuparkPads.map((p) => p.printedNumber),
    Array.from({ length: 55 }, (_, i) => i + 1),
  );
  assert.equal(madhuparkPads.flatMap((p) => p.verses).length, 371);
  for (const pad of madhuparkPads) {
    assert.deepEqual(
      pad.verses,
      pad.lines.map((l) => l.text),
    );
    assert(
      pad.lines.every(
        (l) =>
          l.sourcePage >= 1 &&
          l.sourcePage <= 39 &&
          l.sourceRegion.length === 4,
      ),
    );
    const widths = pad.verses.map((l) => [...l].length * 10);
    const page = madhuparkPage(pad, widths);
    const body = page.lines.filter((l) => l.role === "verse");
    assert.equal(page.width, 288);
    assert.deepEqual(
      body.map((l) => l.text),
      pad.verses,
    );
    assert.equal(new Set(body.map((l) => l.fontSize)).size, 1);
    for (const line of body) {
      assert(line.x >= 25.99 && line.x + line.length <= 286.01);
      assert(line.y > 0 && line.y < page.height);
      assert(pad.sourcePages.includes(line.source.pdfPage));
    }
  }
});

test("Madhupark keeps multi-page verses and excludes adjoining explanations", () => {
  for (const [id, pages, count] of [
    [7, [4, 5], 6],
    [8, [5, 6], 16],
    [15, [11, 12], 8],
    [22, [16, 17], 8],
    [30, [22, 23], 8],
    [31, [23, 24], 8],
    [36, [26, 27], 15],
    [39, [28, 29], 4],
    [43, [31, 32], 40],
  ]) {
    const pad = madhuparkPads[id - 1];
    assert.deepEqual(pad.sourcePages, pages);
    assert.equal(pad.verses.length, count);
  }
  assert.equal(madhuparkPads[28].verses[0], "देखन देत न बैरिनि पलकैं।");
  assert.equal(
    madhuparkPads[54].verses.at(-1),
    "दास परमानंद छिन छिन स्याम ताकी सरन॥",
  );
  const text = madhuparkPads.flatMap((p) => p.verses).join("\n");
  for (const prose of [
    "गोपी कहती हैं कि",
    "परमानन्ददासजी कहते हैं",
    "श्रीराधाकृष्ण ब्यालू",
    "कल केलि",
  ])
    assert(!text.includes(prose));
});

test("Madhupark generated data exactly matches the reviewed transcription and source map", () => {
  const output = execFileSync(
    "python3",
    [
      "-c",
      "import runpy,json; m=runpy.run_path('data/collections/madhupark/build.py'); print(json.dumps(m['build'](),ensure_ascii=False))",
    ],
    { encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), madhupark);
});
