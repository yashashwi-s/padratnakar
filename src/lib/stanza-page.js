/* Shared fixed-line page builder for ordinary stanza-based collections. */
export function stanzaPage(pad, measuredWidths = null) {
  const width = 480;
  const lines = [];
  let y = 30;
  function heading(text, fontSize = 17) {
    lines.push({
      text,
      centered: true,
      x: width / 2,
      y,
      fontSize,
      role: "heading",
    });
    y += 32;
  }
  if (pad.printedNumber)
    heading(
      `[ ${String(pad.printedNumber).replace(/\d/g, (d) => "०१२३४५६७८९"[d])} ]`,
    );
  if (pad.sectionHeading) heading(pad.sectionHeading);
  // Numbered pads already contain their opening line; only the unnumbered
  // closing pieces need their separate printed title above the body.
  if (!pad.printedNumber) heading(pad.title, 19);
  y += 24;
  const scale = measuredWidths
    ? Math.min(1, (width - 36) / Math.max(1, ...measuredWidths))
    : 1;
  const left = measuredWidths
    ? (width - Math.max(1, ...measuredWidths) * scale) / 2
    : 18;
  let index = 0;
  for (const block of pad.stanzas || pad.blocks || [pad.verses || []]) {
    for (const text of block) {
      lines.push({
        text,
        x: left,
        y,
        fontSize: 18 * scale,
        // Font size already applies the fit. Preserve natural glyph widths.
        length: measuredWidths ? undefined : width - 36,
        role: "verse",
        source: { pdfPage: pad.lines?.[index++]?.sourcePage },
      });
      y += 32;
    }
    y += 18;
  }
  return { width, height: y + 12, lines, decorations: [] };
}
