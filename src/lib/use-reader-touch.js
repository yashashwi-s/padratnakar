import { useLayoutEffect, useRef, useState } from "react";

const distance = (a, b) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const midpoint = (a, b) => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});
export const clampZoom = (value) => Math.max(1, Math.min(3, value));

/** Local page zoom: app chrome never scales. Native scroll handles one-finger panning. */
export function useReaderTouch(viewport, onCopy) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pending = useRef(null);
  const copy = useRef(onCopy);
  useLayoutEffect(() => {
    copy.current = onCopy;
  }, [onCopy]);
  useLayoutEffect(() => {
    const element = viewport.current;
    const svg = element.querySelector("svg");
    let pinch = null,
      press = null,
      timer = null,
      frame = null;
    const cancelPress = () => {
      clearTimeout(timer);
      timer = null;
      press = null;
    };
    const start = (event) => {
      cancelPress();
      element.dataset.held = "false";
      if (event.touches.length === 2) {
        event.preventDefault();
        const [a, b] = event.touches;
        const center = midpoint(a, b),
          rect = svg.getBoundingClientRect();
        pinch = {
          distance: distance(a, b),
          zoom: zoomRef.current,
          x: (center.x - rect.left) / zoomRef.current,
          y: (center.y - rect.top) / zoomRef.current,
        };
      } else if (event.touches.length === 1 && !pinch) {
        const touch = event.touches[0];
        press = { x: touch.clientX, y: touch.clientY };
        timer = setTimeout(() => {
          element.dataset.held = "true";
          copy.current?.();
          cancelPress();
        }, 550);
      }
    };
    const move = (event) => {
      if (pinch && event.touches.length === 2) {
        event.preventDefault();
        cancelPress();
        const [a, b] = event.touches;
        const next = clampZoom(
          (pinch.zoom * distance(a, b)) / Math.max(1, pinch.distance),
        );
        pending.current = { ...pinch, center: midpoint(a, b) };
        zoomRef.current = next;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => setZoom(next));
      } else if (press && event.touches.length === 1) {
        const touch = event.touches[0];
        if (Math.hypot(touch.clientX - press.x, touch.clientY - press.y) > 8)
          cancelPress();
      }
    };
    const end = (event) => {
      cancelPress();
      if (!event.touches.length) pinch = null;
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
  }, [viewport]);
  useLayoutEffect(() => {
    const anchor = pending.current;
    if (!anchor) return;
    pending.current = null;
    const element = viewport.current;
    const rect = element.querySelector("svg").getBoundingClientRect();
    element.scrollBy({
      left: rect.left + anchor.x * zoom - anchor.center.x,
      top: 0,
      behavior: "instant",
    });
    window.scrollBy({
      left: 0,
      top: rect.top + anchor.y * zoom - anchor.center.y,
      behavior: "instant",
    });
  }, [zoom, viewport]);
  return zoom;
}
