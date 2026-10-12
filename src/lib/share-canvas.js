// Snapshot after the reader's font fitting has finished. Positions come from
// SVG itself, including centered headings, fragments and raised note markers.
export function captureShareText(svg, styleFor = getComputedStyle) {
  const inverse = svg.getCTM().inverse();
  return [...svg.querySelectorAll(".print-line text")].flatMap((text) => {
    const matrix = inverse.multiply(text.getCTM());
    const spans = [...text.querySelectorAll("tspan")];
    const runs = spans.length ? spans : [text];
    return runs
      .filter((run) => run.textContent.length)
      .map((run) => {
        const position = run.getStartPositionOfChar(0);
        const style = styleFor(run);
        return {
          text: run.textContent,
          x: position.x,
          y: position.y,
          matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
          font: `${style.fontWeight} ${style.fontSize} "Noto Serif Devanagari"`,
          wordSpacing: parseFloat(style.wordSpacing) || 0,
        };
      });
  });
}

export function drawShareText(context, runs) {
  for (const run of runs) {
    context.save();
    context.transform(...run.matrix);
    context.font = run.font;
    context.fillStyle = "black";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    // Split only at spaces, never within a Devanagari shaping cluster. This
    // also works on Android WebViews without Canvas wordSpacing support.
    let x = run.x;
    for (const part of run.text.split(/(\s+)/u)) {
      if (!part) continue;
      context.fillText(part, x, run.y);
      x +=
        context.measureText(part).width +
        (part.match(/\s/gu)?.length || 0) * run.wordSpacing;
    }
    context.restore();
  }
}
