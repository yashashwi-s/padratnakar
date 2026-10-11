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
  // User-requested illustrated display for this pad only. These phrase breaks
  // preserve the Ratnakar wording; the Kallolini transcription is never copied.
  const breaks = [
    "सखि",
    "निवासिनि,",
    "करती",
    "कल",
    "विद्युद्-वर्णा,",
    "सुशोभित,",
    "युत",
    "रचती",
    "केसर-सी,",
    "अति,",
    "वसन-आभूषणसे",
    "अनेक",
    "करती",
    "सदृश,",
    "भंगिमा",
    "व्रजकी",
    "चम्पा-सी,",
    "रँगके",
    "डुलाती",
    "कलाओं",
    "अति",
    "शोभित",
    "कर-चरणोंमें",
    "व्रतोंमें,",
    "शोभित",
    "वर,",
    "करती",
    "शास्त्र-",
    "वर्ण-सी,",
    "मनोहर,",
    "सुरभितसे",
    "करती",
  ];
  const firstBody = page.lines.findIndex((line) => line.role === "verse");
  const lines = page.lines.slice(0, firstBody);
  const body = page.lines.slice(firstBody);
  const illustrations = [];
  let y = body[0].y;
  for (let stanza = 0; stanza < 8; stanza++) {
    const imageLeft = stanza % 2 === 0;
    const x = imageLeft ? 106 : 16;
    const textWidth = 166;
    const top = y - 15;
    for (let offset = 0; offset < 4; offset++) {
      const index = stanza * 4 + offset;
      const line = body[index];
      const at = line.text.indexOf(breaks[index]) + breaks[index].length;
      const parts = [line.text.slice(0, at), line.text.slice(at).trimStart()];
      for (const text of parts) {
        lines.push({
          ...line,
          text,
          segments: undefined,
          x,
          y,
          fontSize: 15,
          fitWidth: textWidth,
          textWidth: x + textWidth + 2,
          sourceFit: true,
          canonicalLine: index,
        });
        y += 24;
      }
      if (offset === 1) y += 8;
    }
    illustrations.push(
      containedDrawing(sakhiIllustrations[stanza], {
        x: imageLeft ? 8 : 194,
        y: top + 12,
        width: 82,
        height: y - top - 36,
      }),
    );
    y += 26;
  }
  for (const line of body.slice(32)) {
    const heading = /^\(/.test(line.text);
    lines.push({
      ...line,
      segments: undefined,
      y,
      x: heading ? page.width / 2 : 26,
      centered: heading,
      role: heading ? "heading" : line.role,
      fontSize: heading ? 13 : 15,
      fitWidth: page.width - 52,
    });
    y += heading ? 32 : 26;
  }
  return { ...page, height: y + 26, lines, illustrations };
}
