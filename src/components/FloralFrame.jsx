import { memo, useId, useMemo } from "react";
import { readerBorderMarkup, readerBorders } from "../lib/reader-borders.js";

// Inside the page SVG: scrolling, pinch zoom and native image shares use one frame.
const FloralFrame = memo(function FloralFrame({ width, height, design }) {
  const id = `border-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markup = useMemo(
    () => readerBorderMarkup(design, width, height, id),
    [design, width, height, id],
  );
  return (
    <g
      aria-hidden="true"
      pointerEvents="none"
      data-border-design={readerBorders[design].name}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
});
export default FloralFrame;
