import { stanzaPage } from "./stanza-page.js";
import transcription from "../../data/collections/radha-kripa-kataksh/transcription.json" with { type: "json" };
export const radhaKripaKataksh = transcription;
export const radhaKripaKatakshPads = [
  {
    id: 1,
    collection: "rkk",
    title: transcription.title,
    printedNumber: null,
    section: transcription.title,
    headings: [],
    stanzas: transcription.stanzas.map((stanza) => stanza.lines),
    verses: transcription.stanzas.flatMap((stanza) => stanza.lines),
    lines: transcription.stanzas.flatMap((stanza) =>
      stanza.lines.map((text) => ({ text, sourcePage: stanza.sourcePage })),
    ),
    textStatus: transcription.source.status,
  },
];
export function radhaKripaKatakshPage(pad, measuredWidths = null) {
  return stanzaPage(pad, measuredWidths, {
    centerStanzas: true,
    indents: transcription.stanzas.flatMap((stanza) =>
      stanza.lines.map((_, i) => (stanza.number <= 13 && i % 2 ? 18 : 0)),
    ),
  });
}
