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
