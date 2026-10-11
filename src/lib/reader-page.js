// All collections share the canonical reader's coordinate scale. Apply this
// before adding the frame, so its band and margins have identical screen sizes.
export function normalizeReaderPage(page) {
  const scale = 288 / page.width;
  if (scale === 1) return page;
  const dimensions = (value) =>
    Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        [
          "x",
          "y",
          "width",
          "height",
          "fontSize",
          "length",
          "fitWidth",
          "textWidth",
        ].includes(key) && typeof v === "number"
          ? v * scale
          : v,
      ]),
    );
  return {
    ...page,
    width: 288,
    height: page.height * scale,
    ruleY: page.ruleY == null ? undefined : page.ruleY * scale,
    lines: page.lines.map(dimensions),
    decorations: page.decorations.map(dimensions),
    illustrations: page.illustrations?.map(dimensions),
  };
}
