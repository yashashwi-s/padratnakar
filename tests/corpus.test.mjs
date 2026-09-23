import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPad,
  getFootnotes,
  getShodashItem,
  shodashCollection,
  padCount,
} from "../src/lib/corpus.js";

test("all pads are addressable without confusing missing ids", () => {
  assert.equal(padCount, 1565);
  assert.equal(getPad("608").id, 608);
  assert.equal(getPad(0), undefined);
  assert.equal(getPad(1566), undefined);
  assert.equal(getPad("unknown"), undefined);
});

test("shared notes resolve on every named pad to one owning record", () => {
  for (const id of [269, 270, 271]) {
    const notes = getFootnotes(id);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].ownerPadId, 271);
    assert.deepEqual(notes[0].sharedWithPadIds, [269, 270, 271]);
  }
  const inferred = getFootnotes(349)[0];
  assert.equal(inferred.ownerPadId, 333);
  assert.equal(
    inferred.locationConfidence,
    "inferred-from-page-position-and-this-pad-wording",
  );
  for (const id of [1551, 1552, 1553, 1554, 1555, 1556])
    assert.equal(getFootnotes(id)[0].ownerPadId, 1556);
  for (const id of [1560, 1561, 1562])
    assert.equal(getFootnotes(id)[0].ownerPadId, 1562);
});

test("Shodash selectors distinguish song number, source pad and bookends", () => {
  assert.equal(getShodashItem({ number: 1 }).padId, 550);
  assert.equal(getShodashItem({ number: 2 }).padId, 608);
  assert.equal(getShodashItem({ padId: 1 }).role, "opening");
  assert.equal(getShodashItem("closing").padId, 1508);
  assert.equal(getShodashItem({ number: 17 }), undefined);
});

test("all 18 collection entries have consecutively numbered stanza endings", () => {
  assert.equal(shodashCollection.items.length, 18);
  for (const item of shodashCollection.items) {
    item.stanzas.forEach((stanza, index) => {
      const number = String(index + 1).replace(
        /[0-9]/g,
        (d) => "०१२३४५६७८९"[Number(d)],
      );
      assert.match(
        stanza.at(-1),
        new RegExp(`॥${number}॥\\*?$`),
        `pad ${item.padId}, stanza ${index + 1}`,
      );
    });
  }
});

test("collection bookends suppress doha while songs retain musical headings", () => {
  assert.deepEqual(getShodashItem("opening").headings, []);
  assert.deepEqual(getShodashItem("closing").headings, []);
  assert(
    getShodashItem({ number: 1 }).headings.some((line) =>
      line.startsWith("(राग "),
    ),
  );
  const second = getShodashItem({ number: 2 });
  assert.equal(second.stanzas[0][0], "हौं तो दासी नित्य तिहारी।");
  assert.equal(
    second.stanzas.flat().filter((line) => line.startsWith("हौं तो दासी"))
      .length,
    1,
  );
});
