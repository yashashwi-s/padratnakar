// Font-ready text metrics survive reader remounts. Bound memory independently of corpus size.
const widths = new Map();
export function fitReaderText(nodes) {
  const elements = [...nodes];
  const keys = elements.map(
    (element) =>
      `${element.parentElement.className.baseVal}|${element.dataset.fitSize}|${element.innerHTML}`,
  );
  // Never interleave geometry writes and reads: one layout flush for the whole page.
  elements.forEach((element, i) => {
    if (widths.has(keys[i])) return;
    element.removeAttribute("word-spacing");
    element.setAttribute("font-size", element.dataset.fitSize);
  });
  const measured = elements.map((element, i) => {
    const key = keys[i];
    if (widths.has(key)) return widths.get(key);
    const width = element.getComputedTextLength();
    if (width > 0) widths.set(key, width);
    return width;
  });
  const body = new Map();
  elements.forEach((element, i) => {
    if (!element.parentElement.className.baseVal.includes("print-verse"))
      return;
    const group = body.get(element.parentElement) || [];
    group.push({
      element,
      natural: measured[i],
      x: Number(element.dataset.fitX),
    });
    body.set(element.parentElement, group);
  });
  // One size for the whole pad body, chosen by its longest complete line.
  // A narrow PDF fragment box must never shrink one word independently.
  let bodySize = Infinity;
  for (const group of body.values())
    for (const { element } of group)
      bodySize = Math.min(bodySize, Number(element.dataset.fitSize));
  let bodyScale = 1;
  for (const [line, group] of body) {
    const natural = group.reduce(
      (sum, { element, natural }) =>
        sum + (natural * bodySize) / Number(element.dataset.fitSize),
      0,
    );
    const room = Number(line.dataset.textWidth) - group[0].x - 2;
    if (natural > 0 && room > 0)
      bodyScale = Math.min(bodyScale, room / natural);
  }
  for (const [line, group] of body) {
    const size = bodySize * bodyScale;
    const lengths = group.map(
      ({ element, natural }) =>
        (natural * size) / Number(element.dataset.fitSize),
    );
    const natural = lengths.reduce((a, b) => a + b, 0);
    const start = group[0].x;
    const end = Math.max(
      ...group.map(({ element, x }) => x + Number(element.dataset.fitWidth)),
    );
    const target = Math.min(
      Number(line.dataset.textWidth) - 2,
      Math.max(end, start + natural),
    );
    const gaps = group
      .slice(0, -1)
      .map(({ element, x }, i) =>
        Math.max(0, group[i + 1].x - x - Number(element.dataset.fitWidth)),
      );
    const gapTotal = gaps.reduce((a, b) => a + b, 0);
    const surplus = Math.max(0, target - start - natural);
    let cursor = start;
    group.forEach(({ element }, i) => {
      element.setAttribute("font-size", String(size));
      element.setAttribute("x", String(cursor));
      element.removeAttribute("word-spacing");
      // Preserve printed fragment gaps; whole lines justify using words only.
      if (group.length === 1 && natural > (target - start) * 0.72) {
        const spaces = (element.textContent.trim().match(/\s+/g) || []).length;
        if (spaces)
          element.setAttribute("word-spacing", String(surplus / spaces));
      }
      cursor +=
        lengths[i] +
        (gapTotal
          ? (surplus * (gaps[i] || 0)) / gapTotal
          : group.length > 1
            ? surplus / (group.length - 1)
            : 0);
    });
  }
  elements.forEach((element, i) => {
    if (body.has(element.parentElement)) return;
    const natural = measured[i],
      width = Number(element.dataset.fitWidth);
    if (!(natural > 0) || !(width > 0)) return;
    element.setAttribute(
      "font-size",
      String(Number(element.dataset.fitSize) * Math.min(1, width / natural)),
    );
    element.removeAttribute("word-spacing");
  });
  while (widths.size > 4096) widths.delete(widths.keys().next().value);
}
