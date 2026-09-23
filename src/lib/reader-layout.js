/** Layout decisions use rendered font metrics, not a viewport breakpoint. */
export function fitLine({
  width,
  naturalWidth,
  fontSize,
  inset = 0,
  extent = 1,
  centered = false,
  citation = false,
  groups = 1,
  words = 1,
}) {
  const indent = Math.max(0, Math.min(0.45, inset));
  const fraction = Math.max(0.45, Math.min(1 - indent, extent));
  const target = width * fraction;
  if (citation) return { mode: "citation", indent: 0, fraction: 1 };
  if (centered && naturalWidth <= width - 2)
    return { mode: "center", indent: 0, fraction: 1 };
  // A line that needs wrapping uses the full measure; never wrap isolated
  // justified fragments or force the final short wrapped line to stretch.
  if (!width || naturalWidth > target - 2)
    return { mode: "flow", indent: 0, fraction: 1 };
  const gaps = groups > 1 ? groups - 1 : words - 1;
  const extraPerGap = gaps > 0 ? (target - naturalWidth) / gaps : Infinity;
  const spread =
    words >= 3 && extraPerGap <= fontSize * (groups > 1 ? 1.8 : 0.7);
  return {
    mode: spread ? (groups > 1 ? "groups" : "justify") : "aligned",
    indent,
    fraction,
  };
}

/** A deliberate left swipe advances in this left-to-right Hindi reader. */
export function swipeDirection(
  start,
  end,
  { selection = false, scale = 1 } = {},
) {
  if (!start || !end || selection || scale > 1.01) return 0;
  const dx = end.x - start.x,
    dy = end.y - start.y,
    duration = end.time - start.time;
  if (
    duration < 40 ||
    duration > 700 ||
    Math.abs(dx) < 72 ||
    Math.abs(dy) > 48 ||
    Math.abs(dx) < Math.abs(dy) * 2
  )
    return 0;
  return dx < 0 ? 1 : -1;
}
