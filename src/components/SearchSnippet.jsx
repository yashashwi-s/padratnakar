import { useLayoutEffect, useRef, useState } from "react";
import { fitSearchExcerpt } from "../lib/search.js";

export default function SearchSnippet({ text, query }) {
  const ref = useRef(null);
  const [fitted, setFitted] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const context = document.createElement("canvas").getContext("2d");
    let active = true;
    const update = () => {
      if (!active) return;
      const style = getComputedStyle(element);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const width = element.clientWidth;
      setFitted({
        text,
        query,
        value: fitSearchExcerpt(
          text,
          query,
          (candidate) =>
            context.measureText(candidate).width <= Math.max(0, width - 2),
        ),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    document.fonts.ready.then(update);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [text, query]);
  return (
    <span ref={ref} className="search-snippet" title={text}>
      {fitted?.text === text && fitted?.query === query ? fitted.value : text}
    </span>
  );
}
