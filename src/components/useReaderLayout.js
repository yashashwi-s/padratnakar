import { useLayoutEffect } from "react";
import { fitLine } from "../lib/reader-layout";

export function useReaderLayout(ref, model) {
  useLayoutEffect(() => {
    const measure = ref.current;
    if (!measure) return;
    const rows = [...measure.querySelectorAll(".verse-row")];
    const metrics = rows.map((row) => row.querySelector(".line-metric"));
    let frame;
    const update = () => {
      const natural = metrics.map(
        (metric) => metric.getBoundingClientRect().width,
      );
      const bodyWidths = natural.filter(
        (_, i) => rows[i].dataset.citation !== "true",
      );
      // Keep short poems comfortably centered rather than stretching them
      // across a desktop. Font changes recompute the measure as well.
      const preferred = Math.ceil(Math.max(1, ...bodyWidths) * 1.12);
      const inlineSize = `min(100%, ${preferred}px)`;
      if (measure.style.inlineSize !== inlineSize)
        measure.style.inlineSize = inlineSize;
      const width = measure.clientWidth;
      rows.forEach((row, i) => {
        const fontSize = parseFloat(getComputedStyle(row).fontSize);
        const result = fitLine({
          width,
          naturalWidth: natural[i],
          fontSize,
          inset: Number(row.dataset.inset),
          extent: Number(row.dataset.extent),
          centered: row.dataset.centered === "true",
          citation: row.dataset.citation === "true",
          groups: Number(row.dataset.groups),
          words: Number(row.dataset.words),
        });
        row.dataset.fit = result.mode;
        row.style.setProperty("--line-indent", `${result.indent * 100}%`);
        row.style.setProperty("--line-width", `${result.fraction * 100}%`);
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(measure);
    metrics.forEach((metric) => observer.observe(metric));
    document.fonts?.addEventListener("loadingdone", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [ref, model]);
}
