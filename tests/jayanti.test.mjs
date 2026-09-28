import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jayanti,
  jayantiPads,
  jayantiShortcuts,
  jayantiPage,
} from "../src/lib/jayanti.js";
import { makeSearchIndex, searchPads } from "../src/lib/search.js";

test("Jayanti preserves 18 entries, all source pages and all body lines", () => {
  assert.equal(jayantiPads.length, 18);
  assert.equal(jayantiPads.filter((p) => p.printedNumber).length, 15);
  assert.deepEqual(
    [...new Set(jayantiPads.flatMap((p) => p.sourcePages))].sort(
      (a, b) => a - b,
    ),
    Array.from({ length: 18 }, (_, i) => i + 1),
  );
  for (const pad of jayantiPads) {
    const page = jayantiPage(pad);
    assert.deepEqual(
      page.lines.filter((l) => l.role === "verse").map((l) => l.text),
      pad.lines.map((l) => l.text),
    );
    assert.ok(
      page.lines.every(
        (line, i, lines) =>
          Number.isFinite(line.y) && (!i || line.y > lines[i - 1].y),
      ),
    );
    assert.equal(pad.uncertainties.length, 0);
  }
});
test("Extra collection shortcuts reuse entries without duplicate search records", () => {
  assert.deepEqual(
    jayantiShortcuts.map((p) => p.id),
    [16, 17, 18],
  );
  assert.equal(
    jayantiShortcuts[1].title,
    "वे ही शतदल-चरण हमारे हृदय पटल पर रहें जड़े",
  );
  const index = makeSearchIndex(jayantiPads);
  assert.equal(index.length, 18);
  assert.equal(
    searchPads(index, "शतदल").filter((r) => r.pad.id === 17).length,
    1,
  );
});
test("User-confirmed readings replace flagged candidates", () => {
  const text = JSON.stringify(jayanti);
  for (const word of [
    "बखन्नाथ",
    "टूंटिया",
    "सम्पादक",
    "बीत्या",
    "प्राकट्योत्सव",
  ])
    assert.ok(text.includes(word), word);
  for (const word of [
    "बख्शनाथ",
    "टूँटिया",
    "सम्पापदक",
    "वीत्या",
    "प्राकट्योत्सक",
  ])
    assert.ok(!text.includes(word), word);
});
