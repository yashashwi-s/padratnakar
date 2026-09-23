import {
  normalizeOpeningQuotes,
  normalizeTypographyStanzas,
  normalizeSegmentsForDisplay,
  typographyModel,
  printSegments,
} from "./typography.js";
import { getFootnotes, shodashCollection } from "./corpus.js";

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 17;
};

/** A fixed coordinate page: line endings and source baseline gaps never reflow. */
export function fixedPrintModel(pad, layout, item = null) {
  const width = layout?.pages[0]?.width || 288;
  const rows = new Map();
  for (const page of layout?.pages || [])
    for (const row of page.lines)
      for (const ref of row.textReferences)
        rows.set(`${ref.role}:${ref.index}`, { ...row, pdfPage: page.pdfPage });
  const stanzas = normalizeTypographyStanzas(
    typographyModel(pad, layout, item),
  );
  const verses = stanzas.flat();
  const gaps = [];
  for (let i = 1; i < verses.length; i++) {
    const a = verses[i - 1].source,
      b = verses[i].source;
    if (
      a &&
      b &&
      a.pdfPage === b.pdfPage &&
      b.baseline - a.baseline > 5 &&
      b.baseline - a.baseline < 35
    )
      gaps.push(b.baseline - a.baseline);
  }
  const leading = median(gaps);
  const lines = [];
  const decorations = [];
  let y = 24,
    previous = null;
  const centered = (text, fontSize = 13, role = "heading") => {
    lines.push({
      text: normalizeOpeningQuotes(text),
      x: width / 2,
      y,
      fontSize,
      centered: true,
      role,
    });
  };
  if (item?.role === "opening") {
    centered(shodashCollection.invocation, 12);
    y += 24;
    centered(shodashCollection.bookTitle, 17);
    y += 22;
    centered(`[ ${shodashCollection.title} ]`, 14);
    y += 30;
  }
  if (item) {
    if (item.number) {
      centered(
        `(${String(item.number).replace(/\d/g, (d) => "०१२३४५६७८९"[d])})`,
        13,
      );
      y += 32;
    }
    if (item.role === "song")
      decorations.push({ x: 20, y: y - 17, width: width - 40, height: 26 });
    centered(item.title, item.role === "song" ? 14 : 15);
    y += 22;
  } else {
    centered(
      `[ ${String(pad.id).replace(/\d/g, (d) => "०१२३४५६७८९"[d])} ]`,
      13,
      "number",
    );
    y += 25;
  }
  function place(text, source, segments, role) {
    if (previous && item?.role === "song" && role === "verse") y += 22;
    else if (previous && source && previous.pdfPage === source.pdfPage)
      y +=
        Math.max(10, source.baseline - previous.baseline) +
        (role === "verse" ? 3 : 0);
    else if (previous) y += leading + (role === "verse" ? 3 : 0);
    const fontSize = source
      ? Math.max(...source.segments.map((s) => s.fontSize))
      : 15;
    lines.push({
      text: normalizeOpeningQuotes(text),
      source,
      segments,
      x: source?.bbox[0] ?? 26,
      y,
      fontSize,
      role,
    });
    previous = source || { pdfPage: -1, baseline: 0 };
  }
  const headings = item?.headings || pad.headings;
  for (const heading of headings) {
    const index = pad.headings.indexOf(heading),
      source = rows.get(`heading:${index}`);
    if (source)
      place(
        heading,
        source,
        normalizeSegmentsForDisplay(printSegments(heading, heading, source)),
        "heading",
      );
    else {
      centered(heading, 13);
      y += leading;
      previous = null;
    }
  }
  // Give the musical heading breathing room without changing verse leading.
  if (headings.length) {
    y = lines.at(-1).y + 60;
    previous = null;
  }
  for (const [stanzaIndex, stanza] of stanzas.entries()) {
    if (stanzaIndex) y += item ? (item.role === "song" ? 12 : 9) : 8;
    for (const line of stanza)
      place(
        line.text,
        line.source,
        line.segments,
        line.citation ? "citation" : "verse",
      );
  }
  const notes = item?.role === "closing" ? [] : getFootnotes(pad);
  let ruleY;
  if (notes.length) {
    ruleY = y + 16;
    y += 32;
  }
  for (const note of notes) {
    let prior;
    note.lines.forEach((text, index) => {
      const span = note.sourceSpans?.[index];
      if (prior && span)
        y +=
          span.page === prior.page
            ? Math.max(12, span.bbox[1] - prior.bbox[1])
            : 15;
      else if (index) y += 15;
      lines.push({
        text: normalizeOpeningQuotes(text),
        x: span?.bbox[0] ?? 26,
        y,
        fontSize: span?.fontSize || 12,
        length: span ? span.bbox[2] - span.bbox[0] : width - 52,
        role: "footnote",
      });
      prior = span;
    });
    y += 22;
  }
  if (item?.role === "closing") {
    y += 30;
    centered(shodashCollection.closingDedication, 16, "dedication");
  }
  return { width, height: y + 26, lines, ruleY, leading, decorations };
}

export function pageDimensions(available) {
  const fit = Math.max(1, Math.min(560, available));
  return { fit, width: fit };
}
