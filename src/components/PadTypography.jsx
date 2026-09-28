import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { kalloliniPage } from "../lib/kallolini";
import { jayantiPage } from "../lib/jayanti";
import { getPrintLayout } from "../lib/print-layout";
import { fixedPrintModel, pageDimensions } from "../lib/fixed-print";
import "./reader-typography.css";
import { preparePadShare } from "../lib/share-pad";
import { useReaderTouch } from "../lib/use-reader-touch";
import { loadReaderFont, READER_FONT } from "../lib/reader-font";

export default function PadTypography({
  pad,
  collectionItem: item,
  onCopy,
  shareKey,
  interactive = true,
}) {
  const [layout, setLayout] = useState(null);
  const [collectionMetrics, setCollectionMetrics] = useState(null);
  useEffect(() => {
    if (!pad.collection) return;
    let active = true;
    loadReaderFont()
      .catch(() => {})
      .then(() => {
        if (!active) return;
        const context = document.createElement("canvas").getContext("2d");
        context.font = READER_FONT;
        setCollectionMetrics({
          id: `${pad.collection}:${pad.id}`,
          widths: pad.verses.map((text) => context.measureText(text).width),
        });
      });
    return () => {
      active = false;
    };
  }, [pad]);
  const [available, setAvailable] = useState(390);
  const viewport = useRef(null);
  useEffect(() => {
    let active = true;
    if (pad.collection) return;
    getPrintLayout(pad.id)
      .then((value) => {
        if (active) setLayout(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pad.id, pad.collection]);
  useLayoutEffect(() => {
    const element = viewport.current;
    const update = () => setAvailable(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    viewport.current.scrollLeft = 0;
  }, [pad.id, pad.collection]);
  const current = layout?.padId === pad.id ? layout : null;
  const page = useMemo(
    () =>
      pad.collection
        ? (pad.collection === "kallolini" ? kalloliniPage : jayantiPage)(
            pad,
            collectionMetrics?.id === `${pad.collection}:${pad.id}`
              ? collectionMetrics.widths
              : null,
          )
        : fixedPrintModel(pad, current, item),
    [pad, current, item, collectionMetrics],
  );
  useEffect(() => {
    if ((!current && !pad.collection) || !shareKey) return;
    let idle;
    const timer = setTimeout(() => {
      const prepare = () => {
        const svg = viewport.current?.querySelector("svg");
        if (svg) preparePadShare(svg, shareKey).catch(() => {});
      };
      if (window.requestIdleCallback)
        idle = window.requestIdleCallback(prepare, { timeout: 1500 });
      else prepare();
    }, 500);
    return () => {
      clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [current, shareKey, pad.collection, collectionMetrics]);
  const dimensions = pageDimensions(available);
  const pageHeight = (dimensions.width * page.height) / (page.width + 24);
  useReaderTouch(viewport, onCopy, dimensions.width, pageHeight, interactive);
  return (
    <div
      className="print-viewport"
      ref={viewport}
      data-zoom="1"
      tabIndex={0}
      role="region"
      aria-label="पद का पाठ"
    >
      <div className="print-canvas">
        <svg
          className="print-page"
          role="document"
          aria-label={
            item?.title || (pad.collection ? pad.title : `पद ${pad.id}`)
          }
          viewBox={`-12 0 ${page.width + 24} ${page.height}`}
          width={dimensions.width}
          height={pageHeight}
          data-layout={current || pad.collection ? "source" : "fallback"}
        >
          {page.decorations.map((box, i) => (
            <rect
              key={i}
              {...box}
              fill="none"
              stroke="black"
              strokeWidth=".65"
            />
          ))}
          {page.ruleY && (
            <line
              x1="26"
              x2={page.width - 26}
              y1={page.ruleY}
              y2={page.ruleY}
              stroke="black"
              strokeWidth=".5"
            />
          )}
          {page.lines.map((line, index) => (
            <g
              key={index}
              className={`print-line print-${line.role}`}
              role={line.role === "number" ? "heading" : undefined}
              aria-level={line.role === "number" ? 1 : undefined}
              data-baseline={line.y}
              data-source-page={line.source?.pdfPage}
            >
              <PrintLine line={line} width={page.width} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function PrintLine({ line, width }) {
  if (line.centered)
    return (
      <text
        x={line.x}
        y={line.y}
        textAnchor="middle"
        fontSize={line.fontSize}
        textLength={line.text.length > 29 ? width - 64 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {line.text}
      </text>
    );
  if (!line.segments)
    return (
      <text
        x={line.x}
        y={line.y}
        fontSize={line.fontSize}
        textLength={line.length}
        wordSpacing={line.wordSpacing}
        lengthAdjust="spacingAndGlyphs"
      >
        {line.text}
      </text>
    );
  return line.segments.map((segment, index) => {
    const box = segment.bbox || line.source?.bbox;
    const x = box?.[0] ?? line.x;
    const length = box ? box[2] - box[0] : width - 52;
    const mixed = segment.runs?.some((run) => !run.raised);
    const baseline =
      line.y +
      (segment.baseline != null && line.source
        ? segment.baseline - line.source.baseline
        : 0);
    return (
      <text
        key={index}
        x={x}
        y={baseline}
        fontSize={segment.fontSize || line.fontSize}
        textLength={length}
        lengthAdjust="spacingAndGlyphs"
        xmlSpace="preserve"
      >
        {segment.runs
          ? segment.runs.map((run, i) => (
              <tspan
                key={i}
                baselineShift={run.raised && mixed ? "super" : undefined}
                fontSize={run.raised && mixed ? 9 : undefined}
              >
                {run.text}
              </tspan>
            ))
          : segment.text}
      </text>
    );
  });
}
