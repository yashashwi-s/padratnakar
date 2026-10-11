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
export function kalloliniPage(pad) {
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
    y += (25 * width) / 288;
  }
  heading(
    pad.printedNumber
      ? `[ ${devanagariNumber(pad.printedNumber)} ]`
      : pad.title,
  );
  // Scan boxes describe line extents, not individual word sizes. Use one
  // coordinate scale for the entire pad, including page continuations.
  const bounds = new Map();
  for (const line of pad.lines) {
    if (line.role !== "verse" || !line.sourceBbox) continue;
    const [left, , right] = line.sourceBbox;
    const b = bounds.get(line.sourcePage) || [left, right];
    bounds.set(line.sourcePage, [Math.min(b[0], left), Math.max(b[1], right)]);
  }
  const span = Math.max(1, ...[...bounds.values()].map(([l, r]) => r - l));
  const ratio = (width - 52) / span;
  const heights = pad.lines
    .filter((line) => line.role === "verse" && line.sourceBbox)
    .map((line) => (line.sourceBbox[3] - line.sourceBbox[1]) * ratio)
    .sort((a, b) => a - b);
  const bodySize = heights.length
    ? heights[Math.floor(heights.length / 2)]
    : 18;
  const gaps = pad.lines
    .slice(1)
    .flatMap((line, i) => {
      const previous = pad.lines[i];
      if (
        line.sourcePage !== previous.sourcePage ||
        !line.sourceBbox ||
        !previous.sourceBbox
      )
        return [];
      const gap = (line.sourceBbox[1] - previous.sourceBbox[1]) * ratio;
      return gap > 0 ? [gap] : [];
    })
    .sort((a, b) => a - b);
  const leading = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 28;
  let previous = null;
  for (const line of pad.lines) {
    if (previous) {
      const sourceGap =
        previous.sourcePage === line.sourcePage &&
        previous.sourceBbox &&
        line.sourceBbox
          ? (line.sourceBbox[1] - previous.sourceBbox[1]) * ratio
          : leading;
      y +=
        previous.role === "musical-heading" && line.role === "verse"
          ? (60 * width) / 288
          : Math.max(sourceGap > 0 ? sourceGap : leading, bodySize * 1.4) +
            (line.role === "verse" ? (3 * width) / 288 : 16);
    }
    const b = bounds.get(line.sourcePage);
    const usable = line.sourceBbox && b;
    const sourceWidth = usable
      ? (line.sourceBbox[2] - line.sourceBbox[0]) * ratio
      : width - 52;
    const centered = line.role === "musical-heading";
    lines.push({
      text: line.text,
      role: centered ? "heading" : line.role,
      x: centered
        ? width / 2
        : usable
          ? 26 + (line.sourceBbox[0] - b[0]) * ratio
          : 26,
      y,
      fontSize: centered ? 16 : line.role === "footnote" ? 14 : bodySize,
      centered,
      length: sourceWidth,
      fitWidth: sourceWidth,
      // Explicit source extents must survive the shared SVG fitter.
      sourceFit: !centered,
      source: {
        pdfPage: line.sourcePage,
        bbox: line.sourceBbox,
        lineIndex: line.sourceLineIndex,
      },
    });
    previous = line;
  }
  return {
    width,
    height: y + 40,
    lines,
    decorations: [],
    sourceScale: ratio,
    sourceBounds: bounds,
  };
}
