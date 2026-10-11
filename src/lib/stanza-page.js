/* Shared fixed-line page builder for ordinary stanza-based collections. */
export function stanzaPage(pad, measuredWidths = null) {
  const width = 288;
  const lines = [];
  let y = 24;
  function heading(text, fontSize = 13) {
    lines.push({
      text,
      centered: true,
      x: width / 2,
      y,
      fontSize,
      role: "heading",
    });
    y += 24;
  }
  if (pad.printedNumber)
    heading(
      `[ ${String(pad.printedNumber).replace(/\d/g, (d) => "०१२३४५६७८९"[d])} ]`,
    );
  if (pad.sectionHeading) heading(pad.sectionHeading);
  // Numbered pads already contain their opening line; only the unnumbered
  // closing pieces need their separate printed title above the body.
  if (!pad.printedNumber) heading(pad.title, 13);
  y += 36;
  const scale = measuredWidths
    ? Math.min(
        1,
        (width - 52) / Math.max(1, ...measuredWidths.map((w) => (w * 15) / 18)),
      )
    : 1;
  const left = measuredWidths
    ? (width - ((Math.max(1, ...measuredWidths) * 15) / 18) * scale) / 2
    : 26;
  let index = 0;
  for (const block of pad.stanzas || pad.blocks || [pad.verses || []]) {
    for (const text of block) {
      lines.push({
        text,
        x: left,
        y,
        fontSize: 15 * scale,
        // Font size already applies the fit. Preserve natural glyph widths.
        length: measuredWidths
          ? ((measuredWidths[index] * 15) / 18) * scale
          : width - 52,
        role: "verse",
        source: { pdfPage: pad.lines?.[index++]?.sourcePage },
      });
      y += 24;
    }
    y += 12;
  }
  return { width, height: y + 12, lines, decorations: [] };
}
