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
  const width = 480;
  const indents = transcription.stanzas.flatMap((stanza) =>
    stanza.lines.map((_, i) => (stanza.number <= 13 && i % 2 ? 120 : 26)),
  );
  const scale = measuredWidths
    ? Math.min(
        1,
        ...measuredWidths.map(
          (length, i) => (width - 26 - indents[i]) / Math.max(1, length),
        ),
      )
    : 1;
  const lines = [
    {
      text: pad.title,
      centered: true,
      x: width / 2,
      y: 30,
      fontSize: 20,
      role: "heading",
    },
  ];
  let y = 130,
    index = 0;
  for (const stanza of pad.stanzas) {
    for (const text of stanza) {
      lines.push({
        text,
        x: indents[index],
        y,
        fontSize: 18 * scale,
        role: "verse",
        fitWidth: width - 26 - indents[index],
        source: { pdfPage: pad.lines[index].sourcePage },
      });
      index++;
      y += 32;
    }
    y += 18;
  }
  return { width, height: y + 24, lines, decorations: [] };
}
