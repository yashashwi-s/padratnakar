import collection from "../../data/collections/mahabhav-kallolini/collection.json" with { type: "json" };
import { devanagariNumber } from "./search.js";

export const kallolini = collection;
export const kalloliniPads = collection.entries.map((entry) => ({
  ...entry,
  id: entry.sequence,
  collection: "kallolini",
  section: collection.sections.find((section) => section.id === entry.sectionId)
    .name,
  collectionTitle: collection.title,
  verses: entry.blocks.flat(),
  stanzas: entry.blocks,
}));

/** Preserve this edition's lines and source alignment, without changing its text. */
export function kalloliniPage(pad, measuredWidths = null) {
  const width = 480;
  const lines = [];
  let y = 30;
  function heading(text, size = 18) {
    lines.push({
      text,
      x: width / 2,
      y,
      fontSize: size,
      centered: true,
      role: "heading",
    });
    y += 32;
  }
  heading(
    pad.printedNumber
      ? `[ ${devanagariNumber(pad.printedNumber)} ]`
      : pad.title,
  );
  let previous = null;
  let verseIndex = 0;
  const scale = measuredWidths
    ? Math.min(1, (width - 52) / Math.max(1, ...measuredWidths))
    : 1;
  const bounds = new Map();
  for (const line of pad.lines) {
    if (line.role !== "verse" || !line.sourceBbox) continue;
    const [left, , right] = line.sourceBbox;
    const b = bounds.get(line.sourcePage) || [left, right];
    bounds.set(line.sourcePage, [Math.min(b[0], left), Math.max(b[1], right)]);
  }
  for (const line of pad.lines) {
    if (line.role === "musical-heading") {
      if (previous) y += 16;
      heading(line.text, 16);
      previous = null;
      continue;
    }
    if (!previous) y += 28;
    else {
      const samePage = previous.sourcePage === line.sourcePage;
      const b = bounds.get(line.sourcePage);
      const ratio = b && b[1] > b[0] ? (width - 52) / (b[1] - b[0]) : 0.48;
      const printedGap =
        samePage && previous.sourceBbox && line.sourceBbox
          ? (line.sourceBbox[3] - previous.sourceBbox[3]) * ratio
          : 28;
      y +=
        Math.max(25, Math.min(48, printedGap)) +
        (previous.stanzaBreakAfter ? 10 : 0);
    }
    const b = bounds.get(line.sourcePage);
    const usable = line.role === "verse" && line.sourceBbox && b && b[1] > b[0];
    const ratio = usable ? (width - 52) / (b[1] - b[0]) : 1;
    const measured = measuredWidths?.[verseIndex];
    const sourceWidth = usable
      ? (line.sourceBbox[2] - line.sourceBbox[0]) * ratio
      : width - 52;
    const naturalWidth = measured != null ? measured * scale : null;
    const spaces = (line.text.match(/\s+/g) || []).length;
    // Scanned line boxes include the book's generous word gaps. Never stretch
    // glyphs to fill those boxes; distribute surplus width only between words.
    const extra = naturalWidth != null ? sourceWidth - naturalWidth : 0;
    lines.push({
      text: line.text,
      role: line.role,
      x: usable ? 26 + (line.sourceBbox[0] - b[0]) * ratio : 26,
      y,
      fontSize: line.role === "footnote" ? 14 : 18 * scale,
      length: naturalWidth != null && extra >= 0 ? undefined : sourceWidth,
      wordSpacing: extra > 0 && spaces ? extra / spaces : undefined,
      source: { pdfPage: line.sourcePage },
    });
    if (line.role === "verse") verseIndex += 1;
    previous = line;
  }
  return { width, height: y + 40, lines, decorations: [] };
}
