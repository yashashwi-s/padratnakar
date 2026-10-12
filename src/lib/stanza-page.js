/* Match the canonical reader: 15-unit body, x=26, right fitting edge=286,
   17-unit source leading + 3 breathing room, and 8 between stanzas. */
export function stanzaPage(pad, measuredWidths = null, options = {}) {
  const width = 288;
  const leftMargin = 26;
  const usableWidth = width - leftMargin - 2;
  const indents = options.indents || [];
  const lines = [];
  let y = 24;
  function heading(text, role = "heading") {
    lines.push({ text, centered: true, x: width / 2, y, fontSize: 13, role });
    y += 25;
  }
  if (pad.printedNumber)
    heading(
      `[ ${String(pad.printedNumber).replace(/\d/g, (d) => "०१२३४५६७८९"[d])} ]`,
      "number",
    );
  if (pad.sectionHeading) {
    heading(pad.sectionHeading);
    y += 35;
  }
  if (!pad.printedNumber) {
    heading(pad.title);
    y += 35;
  }
  const naturalWidths = measuredWidths?.map(
    (w, i) => (w * 15) / 18 + (indents[i] || 0),
  );
  const scale = naturalWidths
    ? Math.min(1, usableWidth / Math.max(1, ...naturalWidths))
    : 1;
  let index = 0;
  const blocks = pad.stanzas || pad.blocks || [pad.verses || []];
  for (const [blockIndex, block] of blocks.entries()) {
    if (blockIndex) y += 8;
    const blockWidth = naturalWidths
      ? Math.max(...naturalWidths.slice(index, index + block.length)) * scale
      : usableWidth;
    const left =
      leftMargin + (options.centerStanzas ? (usableWidth - blockWidth) / 2 : 0);
    for (const text of block) {
      const x = left + (indents[index] || 0) * scale;
      lines.push({
        text,
        x,
        y,
        fontSize: 15 * scale,
        // Canonical whole-line extent. The shared fitter expands word gaps
        // on near-full lines; it never stretches glyphs or short opening lines.
        length: width - x - 26,
        role: "verse",

        source: { pdfPage: pad.lines?.[index]?.sourcePage },
      });
      index++;
      y += 20;
    }
  }
  return { width, height: y + 6, lines, decorations: [] };
}
