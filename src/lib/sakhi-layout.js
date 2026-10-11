// Both editions display the exact same complete scan assets. Fit inside the
// available illustration slot without stretching or cropping any part of it.
function containedDrawing(item, slot) {
  const [left, top, right, bottom] = item.sourceBbox;
  const scale = Math.min(
    slot.width / (right - left),
    slot.height / (bottom - top),
  );
  const width = (right - left) * scale;
  const height = (bottom - top) * scale;
  return {
    ...item,
    x: slot.x + (slot.width - width) / 2,
    y: slot.y + (slot.height - height) / 2,
    width,
    height,
  };
}

export function illustratedSakhiPage(page, pad, sakhiIllustrations = []) {
  if (!sakhiIllustrations.length) return page;
  if (pad.collection === "kallolini" && pad.id === 8) {
    const illustrations = sakhiIllustrations.map((item) => {
      const first = page.lines.find(
        (line) =>
          line.source?.pdfPage === item.sourcePage &&
          line.source?.lineIndex === item.firstLineIndex,
      );
      const last = page.lines.find(
        (line) =>
          line.source?.pdfPage === item.sourcePage &&
          line.source?.lineIndex === item.lastLineIndex,
      );
      const bounds = page.sourceBounds.get(item.sourcePage);
      const ratio = page.sourceScale;
      const height = Math.max(1, last.y - first.y + first.fontSize * 1.6);
      return containedDrawing(item, {
        x: 26 + (item.sourceBbox[0] - bounds[0]) * ratio,
        y: first.y - first.fontSize,
        width: (item.sourceBbox[2] - item.sourceBbox[0]) * ratio,
        height,
      });
    });
    return { ...page, illustrations };
  }
  if (pad.collection || pad.id !== 48) return page;
  // The source edition has full-width lines. Retain them and add a separate
  // artwork column; don't replace them with Kallolini's split-line wording.
  const originals = page.lines.filter(
    (line) => line.role === "verse" && !/^\(/.test(line.text),
  );
  const starts = sakhiIllustrations.map((_, i) => originals[i * 4]);
  let added = 0;
  const illustrations = [];
  const lines = page.lines.map((line) => {
    const index = starts.indexOf(line);
    if (index >= 0) {
      const previous = illustrations.at(-1);
      if (previous)
        added += Math.max(
          0,
          previous.y + previous.height + 22 - (line.y + added - line.fontSize),
        );
      const item = sakhiIllustrations[index];
      illustrations.push(
        containedDrawing(item, {
          x: page.width + 10,
          y: line.y + added - line.fontSize,
          width: 86,
          height: 146,
        }),
      );
    }
    return { ...line, y: line.y + added, textWidth: page.width };
  });
  return {
    ...page,
    width: page.width + 110,
    height: page.height + added,
    lines,
    illustrations,
  };
}
