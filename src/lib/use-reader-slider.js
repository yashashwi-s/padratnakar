import { useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { createReaderSlider } from "./reader-slider";

export function useReaderSlider(track, onStep) {
  const commit = useRef(onStep);
  useLayoutEffect(() => {
    commit.current = onStep;
  }, [onStep]);
  const engine = useRef(null);
  useLayoutEffect(() => {
    const slider = createReaderSlider({
      element: () => track.current,
      commit: (direction) => flushSync(() => commit.current(direction)),
      scrollY: () => window.scrollY,
      viewportHeight: () => window.innerHeight,
      reducedMotion: () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      translateX: (element) =>
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    });
    engine.current = slider;
    window.addEventListener("popstate", slider.reset);
    window.addEventListener("hashchange", slider.reset);
    return () => {
      slider.reset();
      window.removeEventListener("popstate", slider.reset);
      window.removeEventListener("hashchange", slider.reset);
    };
  }, [track]);
  return {
    prepare: () => engine.current?.prepare(),
    drag: (dx) => engine.current?.drag(dx),
    slide: (direction, velocity) => engine.current?.slide(direction, velocity),
    reset: () => engine.current?.reset(),
  };
}
