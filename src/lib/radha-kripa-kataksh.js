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
  const width = 288;
  // Keep the scanned continuation rhythm, with a modest indent and a centered
  // text block. Font measurements are at 18px; the common reader seed is 15px.
  const indents = transcription.stanzas.flatMap((stanza) =>
    stanza.lines.map((_, i) => (stanza.number <= 13 && i % 2 ? 18 : 0)),
  );
  const target = 15;
  const maximum = measuredWidths
    ? Math.max(...measuredWidths.map((w, i) => (w * target) / 18 + indents[i]))
    : width - 52;
  const scale = Math.min(1, (width - 52) / maximum);
  const lines = [
    {
      text: pad.title,
      centered: true,
      x: width / 2,
      y: 24,
      fontSize: 13,
      role: "heading",
    },
  ];
  let y = 84,
    index = 0;
  for (const stanza of pad.stanzas) {
    const stanzaWidth = measuredWidths
      ? Math.max(
          ...stanza.map(
            (_, offset) =>
              (measuredWidths[index + offset] * target) / 18 +
              indents[index + offset],
          ),
        ) * scale
      : maximum * scale;
    const left = (width - stanzaWidth) / 2;
    for (const text of stanza) {
      const x = left + indents[index] * scale;
      lines.push({
        text,
        x,
        y,
        fontSize: target * scale,
        role: "verse",
        fitWidth: measuredWidths
          ? ((measuredWidths[index] * target) / 18) * scale
          : width - 26 - x,
        source: { pdfPage: pad.lines[index].sourcePage },
      });
      index++;
      y += 24;
    }
    y += 12;
  }
  return { width, height: y + 20, lines, decorations: [] };
}
