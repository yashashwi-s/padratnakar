const compact = (text) => text.replace(/\s+/gu, "");

// Partition the accepted string, never replace it with independently decoded text.
// Adjacent font fragments inside a word stay together so Devanagari shaping survives.
export function printSegments(text, sourceText, line) {
  if (!line?.segmentTextAligned || !line.segments.length) return [{ text }];
  if (
    compact(line.segments.map((s) => s.text).join("")) !== compact(sourceText)
  )
    return [{ text }];
  const segments = [];
  let cursor = 0;
  for (const fragment of line.segments) {
    const start = cursor;
    let remaining = compact(fragment.text).length;
    while (cursor < sourceText.length && remaining > 0) {
      if (!/\s/u.test(sourceText[cursor])) remaining--;
      cursor++;
    }
    // Include canonical whitespace with the preceding group for copy/paste.
    while (cursor < sourceText.length && /\s/u.test(sourceText[cursor]))
      cursor++;
    const piece = {
      text: sourceText.slice(start, cursor),
      bbox: fragment.bbox,
      baseline: fragment.baseline,
      fontSize: fragment.fontSize,
    };
    piece.runs = [
      {
        text: piece.text,
        raised:
          /^[०-९0-9]+$/u.test(piece.text.trim()) &&
          fragment.baseline < line.baseline - 1,
      },
    ];
    const previous = segments.at(-1);
    if (previous && !/\s$/u.test(previous.text)) {
      previous.text += piece.text;
      previous.runs.push(...piece.runs);
      previous.bbox = [
        previous.bbox[0],
        Math.min(previous.bbox[1], piece.bbox[1]),
        piece.bbox[2],
        Math.max(previous.bbox[3], piece.bbox[3]),
      ];
    } else segments.push(piece);
  }
  if (segments.map((s) => s.text).join("") !== sourceText) return [{ text }];
  // Shodash changes only the stanza ending; preserve its displayed numbering.
  if (text !== sourceText) {
    const last = segments.at(-1);
    const prefix = segments
      .slice(0, -1)
      .map((s) => s.text)
      .join("");
    if (!text.startsWith(prefix)) return [{ text }];
    last.text = text.slice(prefix.length);
    last.runs = [{ text: last.text, raised: false }];
  }
  return segments;
}

export function typographyModel(pad, layout, collectionItem = null) {
  const rows = new Map();
  for (const page of layout?.pages || [])
    for (const line of page.lines) {
      for (const ref of line.textReferences)
        rows.set(`${ref.role}:${ref.index}`, {
          ...line,
          pdfPage: page.pdfPage,
        });
    }
  const bodyRows = pad.verses
    .map((text, index) => ({ text, ...rows.get(`verse:${index}`) }))
    .filter((r) => r.bbox && !r.text.startsWith("(गीता"));
  const left = bodyRows.length
    ? Math.min(...bodyRows.map((r) => r.bbox[0]))
    : 0;
  const right = bodyRows.length
    ? Math.max(...bodyRows.map((r) => r.bbox[2]))
    : 1;
  const width = Math.max(1, right - left);
  const stanzas = collectionItem?.stanzas || pad.stanzas;
  let index = 0;
  const openingCount = collectionItem?.openingLines?.length || 0;
  return stanzas.map((stanza) =>
    stanza.map((text) => {
      const displayIndex = index++;
      const verseIndex = displayIndex - openingCount;
      const sourceText =
        verseIndex < 0
          ? pad.headings.find(
              (h) => compact(h) === compact(text.replace(/।$/u, "")),
            ) || text
          : pad.verses[verseIndex];
      const ref =
        verseIndex < 0
          ? `heading:${pad.headings.indexOf(sourceText)}`
          : `verse:${verseIndex}`;
      const source = rows.get(ref);
      const citation = /^\s*\(गीता/u.test(text);
      const inset = source ? Math.max(0, (source.bbox[0] - left) / width) : 0;
      const extent = source
        ? Math.min(1, (source.bbox[2] - source.bbox[0]) / width)
        : 1;
      const centered =
        source &&
        extent < 0.8 &&
        Math.abs((source.bbox[0] + source.bbox[2]) / 2 - (left + right) / 2) <
          width * 0.045;
      return {
        text,
        source,
        segments: printSegments(text, sourceText || text, source),
        citation,
        centered,
        inset,
        extent,
      };
    }),
  );
}
