import collection from "../../data/collections/bhaiji-jayanti/collection.json" with { type: "json" };

export const jayanti = collection;
export const jayantiPads = collection.entries.map((entry) => ({
  ...entry,
  id: entry.sequence,
  collection: "jayanti",
  section: collection.title,
  headings: [],
  verses: entry.blocks.flat(),
  stanzas: entry.blocks,
}));
export const jayantiShortcuts = jayantiPads.slice(15);
export function jayantiPage(pad, measuredWidths = null) {
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
    ? Math.min(1, (width - 36) / Math.max(...measuredWidths))
    : 1;
  const left = measuredWidths
    ? (width - Math.max(...measuredWidths) * scale) / 2
    : 18;
  let index = 0;
  for (const block of pad.blocks) {
    for (const text of block) {
      lines.push({
        text,
        x: left,
        y,
        fontSize: 18 * scale,
        // Font size already applies the fit. Preserve natural glyph widths.
        length: measuredWidths ? undefined : width - 36,
        role: "verse",
        source: { pdfPage: pad.lines[index++].sourcePage },
      });
      y += 32;
    }
    y += 18;
  }
  return { width, height: y + 12, lines, decorations: [] };
}
