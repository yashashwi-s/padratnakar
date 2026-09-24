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
      svg = element.querySelector("svg");
    const apply = (value) => {
      canvas.style.setProperty("width", `${width * value}px`);
      canvas.style.setProperty("height", `${height * value}px`);
      svg.style.setProperty("transform", `scale(${value})`);
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
      apply(value);
      const rect = canvas.getBoundingClientRect();
      element.scrollBy({
        left: rect.left + anchor.x * value - center.x,
        top: 0,
        behavior: "instant",
      });
      window.scrollBy({
        left: 0,
        top: rect.top + anchor.y * value - center.y,
        behavior: "instant",
      });
    };
    const start = (event) => {
      cancelPress();
      element.setAttribute("data-held", "false");
      if (event.touches.length === 2) {
        if (event.cancelable) event.preventDefault();
        const [a, b] = event.touches,
          center = midpoint(a, b),
          rect = svg.getBoundingClientRect();
        pinch = {
          distance: distance(a, b),
          zoom: zoom.current,
          x: (center.x - rect.left) / zoom.current,
          y: (center.y - rect.top) / zoom.current,
        };
        svg.style.setProperty("will-change", "transform");
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
          value: clampZoom(
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
      if (event.touches.length < 2 && pinch) {
        cancelAnimationFrame(frame);
        paint();
        pinch = null;
        svg.style.removeProperty("will-change");
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
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("contextmenu", context);
    };
  }, [viewport, width, height, interactive]);
}
