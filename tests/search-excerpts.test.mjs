import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSearchIndex, searchPads } from "../src/lib/search.js";
const lines = [
  "शुरुआत प्रेम राधा मधुर वन फूल नयन सखी कुंज रस मोहन प्यारी सुंदर चरण छवि दर्शन मन आनन्द श्याम सेवक वृन्दावन प्रार्थना ललिता विशाखा वन्दना अरुण कमल सुगन्ध गीत प्रेमी नित्य",
  "मध्य माधुरी संकेत अनोखा कमल चरण शांति सेवा फूल ज्ञान रस सरिता कुसुम मन मोहन दर्शन माधव सखी मधुर प्यारी वन बाग पवन जल प्रेम श्याम नयन मिलन",
  "अंत अनुग्रह कृपा दर्शन सखी मधुर चरण सरोज आनन्द सेवा राधे धन्यवाद समापन",
];
const index = makeSearchIndex([{ id: 1, title: lines[0], verses: lines }]);
test("search excerpts retain context and put ellipses only at omitted pad boundaries", () => {
  const first = searchPads(index, "शुरुआत")[0].snippet;
  assert.ok(first.startsWith("शुरुआत"));
  assert.ok(first.endsWith("…"));
  const middle = searchPads(index, "अनोखा")[0].snippet;
  assert.ok(middle.includes("माधुरी संकेत अनोखा कमल चरण"));
  assert.ok(middle.startsWith("…"));
  assert.ok(middle.endsWith("…"));
  const last = searchPads(index, "समापन")[0].snippet;
  assert.ok(last.startsWith("…"));
  assert.ok(last.endsWith("समापन"));
});
test("short complete pads never receive invented ellipses, including Latin-script matches", () => {
  const small = makeSearchIndex([
    { id: 2, title: "राधा", verses: ["राधा मधुर प्यारी।", "श्याम कमल चरण॥"] },
  ]);
  assert.equal(
    searchPads(small, "radha")[0].snippet,
    "राधा मधुर प्यारी। श्याम कमल चरण॥",
  );
});

test("metadata and footnote excerpts keep the actual searched text visible", () => {
  const notes = makeSearchIndex([
    {
      id: 3,
      title: "राधा",
      raag: "आसावरी",
      verses: ["राधा मधुर प्यारी।"],
      footnotes: [{ lines: ["विशेष टिप्पणी"] }],
    },
  ]);
  assert.ok(searchPads(notes, "आसावरी")[0].snippet.startsWith("आसावरी\n"));
  assert.equal(searchPads(notes, "टिप्पणी")[0].snippet, "…विशेष टिप्पणी");
});
