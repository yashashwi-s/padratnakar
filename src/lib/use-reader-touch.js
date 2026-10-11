import { useLayoutEffect, useRef } from "react";

const distance = (a, b) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const midpoint = (a, b) => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});
export const clampZoom = (value) => Math.max(1, Math.min(3, value));

/** Composite the already-laid-out SVG; never rerender its text during a pinch. */
export function useReaderTouch(
  viewport,
  onCopy,
  width,
  height,
  interactive = true,
) {
  const zoom = useRef(1),
    copy = useRef(onCopy);
  useLayoutEffect(() => {
    copy.current = onCopy;
  }, [onCopy]);
  useLayoutEffect(() => {
    const element = viewport.current,
      canvas = element.querySelector(".print-canvas"),
      surface = element.querySelector(".print-surface");
    const apply = (value) => {
      canvas.style.setProperty("width", `${width * value}px`);
      canvas.style.setProperty("height", `${height * value}px`);
      surface.style.setProperty("transform", `scale(${value})`);
      element.setAttribute("data-zoom", String(value));
    };
    if (!interactive) zoom.current = 1;
    apply(zoom.current);
    if (!interactive) return;
    let pinch = null,
      press = null,
      timer = null,
      frame = null,
      pending = null;
    const cancelPress = () => {
      clearTimeout(timer);
      timer = null;
      press = null;
    };
    const paint = () => {
      frame = null;
      if (!pending) return;
      const { value, center, anchor } = pending;
      pending = null;
      zoom.current = value;
      // At fitted size a second finger must not turn the page into a movable
      // sheet. At larger sizes keep the page covering the visible viewport.
      const horizontal =
        value <= 1.01
          ? 0
          : Math.max(
              anchor.right - anchor.left - width * value,
              Math.min(
                anchor.viewportLeft - anchor.left,
                center.x - anchor.left - anchor.x * value,
              ),
            );
      const vertical =
        value <= 1.01
          ? 0
          : Math.max(
              anchor.bottom - anchor.top - height * value,
              Math.min(
                Math.max(0, anchor.visibleTop - anchor.top),
                center.y - anchor.top - anchor.y * value,
              ),
            );
      anchor.dx = horizontal;
      anchor.dy = vertical;
      // Animate an HTML compositor layer; SVG text and border are unchanged.
      surface.style.setProperty(
        "transform",
        `translate3d(${horizontal}px, ${vertical}px, 0) scale(${value})`,
      );
    };
    const start = (event) => {
      cancelPress();
      element.setAttribute("data-held", "false");
      if (event.touches.length === 2) {
        if (event.cancelable) event.preventDefault();
        const [a, b] = event.touches,
          center = midpoint(a, b),
          rect = surface.getBoundingClientRect(),
          base = canvas.getBoundingClientRect(),
          visible = element.getBoundingClientRect();
        pinch = {
          viewportLeft: visible.left,
          right: visible.right,
          visibleTop: Math.max(0, visible.top),
          bottom: Math.min(window.innerHeight, visible.bottom),
          dx: 0,
          dy: 0,
          left: base.left,
          top: base.top,
          center,
          distance: distance(a, b),
          zoom: zoom.current,
          x: (center.x - rect.left) / zoom.current,
          y: (center.y - rect.top) / zoom.current,
        };
        element.setAttribute("data-pinching", "true");
        surface.style.setProperty("will-change", "transform");
      } else if (event.touches.length === 1 && !pinch) {
        const touch = event.touches[0];
        press = { x: touch.clientX, y: touch.clientY };
        timer = setTimeout(() => {
          element.setAttribute("data-held", "true");
          copy.current?.();
          cancelPress();
        }, 550);
      }
    };
    const move = (event) => {
      if (pinch && event.touches.length === 2) {
        if (event.cancelable) event.preventDefault();
        cancelPress();
        const [a, b] = event.touches;
        pending = {
          value:
            pinch.zoom === 1 &&
            Math.abs(distance(a, b) / Math.max(1, pinch.distance) - 1) < 0.04
              ? 1
              : clampZoom(
                  (pinch.zoom * distance(a, b)) / Math.max(1, pinch.distance),
                ),
          center: midpoint(a, b),
          anchor: pinch,
        };
        if (frame === null) frame = requestAnimationFrame(paint);
      } else if (press && event.touches.length === 1) {
        const t = event.touches[0];
        if (Math.hypot(t.clientX - press.x, t.clientY - press.y) > 8)
          cancelPress();
      }
    };
    const end = (event) => {
      cancelPress();
      if ((event.type === "touchcancel" || event.touches.length < 2) && pinch) {
        cancelAnimationFrame(frame);
        paint();
        const anchor = pinch;
        apply(zoom.current);
        const rect = canvas.getBoundingClientRect();
        if (zoom.current <= 1.01) {
          element.scrollLeft = 0;
        } else {
          element.scrollBy({
            left: rect.left - anchor.left - anchor.dx,
            top: 0,
            behavior: "instant",
          });
          window.scrollBy({
            left: 0,
            top: rect.top - anchor.top - anchor.dy,
            behavior: "instant",
          });
        }
        element.setAttribute("data-pinching", "false");
        pinch = null;
        surface.style.removeProperty("will-change");
      }
    };
    const context = (event) => event.preventDefault();
    element.addEventListener("touchstart", start, { passive: false });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("contextmenu", context);
    return () => {
      cancelPress();
      cancelAnimationFrame(frame);
      surface.style.removeProperty("will-change");
      element.setAttribute("data-pinching", "false");
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("contextmenu", context);
    };
  }, [viewport, width, height, interactive]);
}
