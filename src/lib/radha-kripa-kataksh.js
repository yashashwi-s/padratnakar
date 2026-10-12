import { stanzaPage } from "./stanza-page.js";
import transcription from "../../data/collections/radha-kripa-kataksh/transcription.json" with { type: "json" };
export const radhaKripaKataksh = transcription;
// User-requested display pairing. Keep the 116 source lines untouched and
// attach both original line indices to each combined reader line.
const displayStanzas = transcription.stanzas.map((stanza) => {
  const lines = [];
  for (let i = 0; i < stanza.lines.length; i += stanza.number <= 13 ? 2 : 1) {
    const pair =
      stanza.number <= 13 ? stanza.lines.slice(i, i + 2) : [stanza.lines[i]];
    lines.push({
      text: pair.join(pair[0].endsWith("-") ? "" : " "),
      sourcePage: stanza.sourcePage,
      sourceLineIndices: pair.map((_, offset) => i + offset),
      sourceStanza: stanza.number,
    });
  }
  return lines;
});
export const radhaKripaKatakshPads = [
  {
    id: 1,
    collection: "rkk",
    title: transcription.title,
    printedNumber: null,
    section: transcription.title,
    headings: [],
    stanzas: displayStanzas.map((stanza) => stanza.map((line) => line.text)),
    verses: displayStanzas.flatMap((stanza) => stanza.map((line) => line.text)),
    lines: displayStanzas.flat(),
    textStatus: transcription.source.status,
  },
];
export function radhaKripaKatakshPage(pad, measuredWidths = null) {
  return stanzaPage(pad, measuredWidths);
}
