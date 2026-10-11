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
    const first = page.lines.findIndex((line) => line.role === "verse");
    return arrangeSakhiStanzas(
      page,
      page.lines.slice(0, first),
      page.lines.slice(first, first + 64),
      page.lines.slice(first + 64),
      sakhiIllustrations,
    );
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
    "हरताल-सदृश,",
    "भंगिमा",
    "व्रजकी",
    "चम्पा-सी,",
    "रँगके",
    "डुलाती",
    "कलाओं",
    "अति",
    "शोभित",
    "कर-चरणोंमें",
    "त्यौहार-व्रतोंमें,",
    "शोभित",
    "वर,",
    "करती",
    "शास्त्र-",
    "स्वर्ण-वर्ण-सी,",
    "मनोहर,",
    "सुरभितसे",
    "करती",
  ];
  const firstBody = page.lines.findIndex((line) => line.role === "verse");
  const lines = page.lines.slice(0, firstBody);
  const body = page.lines.slice(firstBody);
  const phrases = [];
  for (let index = 0; index < 32; index++) {
    const line = body[index];
    const marker = breaks[index];
    // Match a whole phrase boundary. "कल" must not match inside "कला".
    const markerStart =
      marker === "शास्त्र-"
        ? line.text.indexOf(marker)
        : line.text.indexOf(` ${marker} `) + 1;
    if (markerStart < 1)
      throw new Error(`Missing Pad 48 phrase boundary: ${index}`);
    const at = markerStart + marker.length;
    for (const text of [
      line.text.slice(0, at),
      line.text.slice(at).trimStart(),
    ])
      phrases.push({
        ...line,
        text,
        segments: undefined,
        canonicalLine: index,
      });
  }
  return arrangeSakhiStanzas(
    page,
    lines,
    phrases,
    body.slice(32),
    sakhiIllustrations,
  );
}

// Each stanza is one straight, naturally spaced column. Only whole stanza /
// illustration pairs alternate sides. Both editions retain their own wording.
function arrangeSakhiStanzas(page, headings, body, ending, artwork) {
  const scale = page.width / 288;
  const lines = [...headings];
  const illustrations = [];
  let y = body[0].y;
  for (let stanza = 0; stanza < 8; stanza++) {
    const imageLeft = stanza % 2 === 0;
    const x = (imageLeft ? 90 : 8) * scale;
    const top = y - 16 * scale;
    for (let offset = 0; offset < 8; offset++) {
      lines.push({
        ...body[stanza * 8 + offset],
        segments: undefined,
        x,
        y,
        centered: false,
        fontSize: 16 * scale,
        fitWidth: 190 * scale,
        length: 190 * scale,
        textWidth: x + 192 * scale,
        sourceFit: true,
        justify: false,
      });
      y += 25 * scale;
      if (offset === 3) y += 8 * scale;
    }
    illustrations.push(
      containedDrawing(artwork[stanza], {
        x: (imageLeft ? 8 : 218) * scale,
        y: top + 12 * scale,
        width: 62 * scale,
        height: y - top - 36 * scale,
      }),
    );
    y += 26 * scale;
  }
  for (const line of ending) {
    const heading = /^\(/.test(line.text);
    lines.push({
      ...line,
      segments: undefined,
      y,
      x: heading ? page.width / 2 : 26 * scale,
      centered: heading,
      role: heading ? "heading" : line.role,
      fontSize: (heading ? 13 : 16) * scale,
      fitWidth: page.width - 52 * scale,
      length: page.width - 52 * scale,
      textWidth: page.width - 24 * scale,
      sourceFit: true,
      justify: false,
    });
    y += (heading ? 32 : 26) * scale;
  }
  return { ...page, height: y + 26 * scale, lines, illustrations };
}
