const compact = (text) => text.replace(/\s+/gu, "");
const citationPattern = /^\s*\((?:गीता\s*|[०-९0-9]+।|कवीन्द्र\s)/u;

// Keep accepted corpus text unchanged while presenting paired Hindi
// quotation marks with a typographic opening mark. A quote before Hindi at
// a word boundary is an opener even when a multi-line speech has no closer.
export function normalizeOpeningQuotes(text) {
  return text.replace(/(?<![\p{L}\p{N}\p{M}])'(?=['‘]*[\u0900-\u097F])/gu, "‘");
}

export function normalizeTextLines(lines) {
  return normalizeOpeningQuotes(lines.join("\n")).split("\n");
}

export function normalizeSegmentsForDisplay(segments) {
  const source = segments
    .flatMap((segment) => segment.runs || [{ text: segment.text }])
    .map((run) => run.text)
    .join("");
  const normalized = normalizeOpeningQuotes(source);
  let offset = 0;
  return segments.map((segment) => {
    const next = { ...segment };
    if (segment.runs) {
      next.runs = segment.runs.map((run) => {
        const text = normalized.slice(offset, offset + run.text.length);
        offset += run.text.length;
        return { ...run, text };
      });
      next.text = next.runs.map((run) => run.text).join("");
    } else {
      next.text = normalized.slice(offset, offset + segment.text.length);
      offset += segment.text.length;
    }
    return next;
  });
}

export function normalizeTypographyStanzas(stanzas) {
  const lines = stanzas.flat();
  const source = lines.map((line) => line.text).join("\n");
  const normalized = normalizeOpeningQuotes(source);
  let offset = 0;
  const displayLines = lines.map((line) => {
    const text = normalized.slice(offset, offset + line.text.length);
    offset += line.text.length + 1;
    const segments = normalizeSegmentsForDisplay(line.segments);
    let segmentOffset = 0;
    const displaySegments = segments.map((segment) => {
      const length = segment.text.length;
      const displayText = text.slice(segmentOffset, segmentOffset + length);
      segmentOffset += length;
      if (segment.runs) {
        let runOffset = 0;
        segment.runs = segment.runs.map((run) => {
          const runText = displayText.slice(
            runOffset,
            runOffset + run.text.length,
          );
          runOffset += run.text.length;
          return { ...run, text: runText };
        });
        segment.text = segment.runs.map((run) => run.text).join("");
      } else segment.text = displayText;
      return segment;
    });
    return { ...line, text, segments: displaySegments };
  });
  let index = 0;
  return stanzas.map((stanza) => stanza.map(() => displayLines[index++]));
}

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
  // Collection display can change numbering or punctuation without changing
  // the canonical line or its position.
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
    .filter((r) => r.bbox && !citationPattern.test(r.text));
  const left = bodyRows.length
    ? Math.min(...bodyRows.map((r) => r.bbox[0]))
    : 0;
  const right = bodyRows.length
    ? Math.max(...bodyRows.map((r) => r.bbox[2]))
    : 1;
  const width = Math.max(1, right - left);
  const stanzas = collectionItem?.stanzas || pad.stanzas;
  let index = 0;
  return stanzas.map((stanza) =>
    stanza.map((text) => {
      const verseIndex = index++;
      const sourceText = pad.verses[verseIndex];
      const source = rows.get(`verse:${verseIndex}`);
      const citation = citationPattern.test(text);
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
