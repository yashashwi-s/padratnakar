import { useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";

/** Three neighbouring pages share one strip; only its compositor transform moves. */
export function useReaderSlider(track, onStep) {
  const offset = useRef(0),
    animation = useRef(null);
  const commit = useRef(onStep);
  useLayoutEffect(() => {
    commit.current = onStep;
  }, [onStep]);
  function reset() {
    animation.current?.cancel();
    animation.current = null;
    offset.current = 0;
    track.current?.style.removeProperty("transform");
    track.current?.style.removeProperty("min-height");
    track.current
      ?.querySelectorAll(".reader-panel")
      .forEach((panel) => panel.style.removeProperty("padding-top"));
  }
  useLayoutEffect(
    () => () => {
      animation.current?.cancel();
    },
    [],
  );
  function prepare() {
    if (animation.current || !track.current) return false;
    track.current.style.setProperty(
      "min-height",
      `${Math.max(track.current.clientHeight, window.scrollY + window.innerHeight)}px`,
    );
    track.current
      .querySelectorAll('[data-current="false"]')
      .forEach((panel) =>
        panel.style.setProperty("padding-top", `${window.scrollY}px`),
      );
    return true;
  }
  function drag(dx) {
    if (!track.current || animation.current) return;
    const width = track.current.clientWidth;
    offset.current = Math.max(-width, Math.min(width, dx));
    track.current.style.setProperty(
      "transform",
      `translate3d(${offset.current}px,0,0)`,
    );
  }
  function slide(direction) {
    if (!prepare()) return;
    const element = track.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reset();
      if (direction) commit.current(direction);
      return;
    }
    const motion = element.animate(
      [
        { transform: `translate3d(${offset.current}px,0,0)` },
        { transform: `translate3d(${-direction * element.clientWidth}px,0,0)` },
      ],
      {
        duration: direction ? 240 : 160,
        easing: "cubic-bezier(.22,.7,.2,1)",
        fill: "forwards",
      },
    );
    animation.current = motion;
    motion.finished
      .then(() => {
        if (animation.current !== motion) return;
        if (direction) flushSync(() => commit.current(direction));
        reset();
      })
      .catch(() => {});
  }
  return { prepare, drag, slide, reset };
}
