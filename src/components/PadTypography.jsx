import { illustratedSakhiPage } from "../lib/sakhi-layout.js";
import { fitReaderText } from "../lib/fit-reader-text.js";
import FloralFrame from "./FloralFrame";
import { Capacitor } from "@capacitor/core";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { readerCollections } from "../lib/reader-collections";
import { getPrintLayout } from "../lib/print-layout";
import { fixedPrintModel, pageDimensions } from "../lib/fixed-print";
import "./reader-typography.css";
import { preparePadShare, warmShareResources } from "../lib/share-pad";
import { useReaderTouch } from "../lib/use-reader-touch";
import { loadReaderFont, READER_FONT } from "../lib/reader-font";

export default function PadTypography({
  pad,
  collectionItem: item,
  onCopy,
  shareKey,
  borderIndex,
  interactive = true,
}) {
  const [layout, setLayout] = useState(null);
  const needsArt =
    pad.collection === "kallolini"
      ? pad.id === 8
      : !pad.collection && pad.id === 48;
  const [sakhiArt, setSakhiArt] = useState(null);
  useEffect(() => {
    if (!needsArt) return;
    let active = true;
    import("../lib/sakhi-illustrations.js")
      .then((module) => {
        if (active) setSakhiArt(module.sakhiIllustrations);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [needsArt]);
  const [collectionMetrics, setCollectionMetrics] = useState(null);
  useEffect(() => {
    if (!pad.collection || pad.collection === "kallolini") return;
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
  const [minimumHeight, setMinimumHeight] = useState(0);
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
    const header = document.querySelector(".app-header");
    const chrome = document.querySelector(".reader-chrome");
    const footer = document.querySelector(".bottom-nav");
    const update = () => {
      setAvailable(element.clientWidth);
      const footerHeight = footer?.getBoundingClientRect().height || 68;
      element
        .closest(".reader-panel")
        ?.style.setProperty("--actual-reader-footer", `${footerHeight}px`);
      setMinimumHeight(
        Math.max(
          0,
          window.innerHeight -
            (header?.getBoundingClientRect().height || 0) -
            (chrome?.getBoundingClientRect().height || 0) -
            (footer?.getBoundingClientRect().height || 0),
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    [element, header, chrome, footer]
      .filter(Boolean)
      .forEach((node) => observer.observe(node));
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    viewport.current.scrollLeft = 0;
  }, [pad.id, pad.collection]);
  const current = layout?.padId === pad.id ? layout : null;
  const page = useMemo(
    () =>
      illustratedSakhiPage(
        pad.collection
          ? readerCollections[pad.collection].page(
              pad,
              collectionMetrics?.id === `${pad.collection}:${pad.id}`
                ? collectionMetrics.widths
                : null,
            )
          : fixedPrintModel(pad, current, item),
        pad,
        sakhiArt || [],
      ),
    [pad, current, item, collectionMetrics, sakhiArt],
  );
  // One font-ready batch per page model, never an effect per text fragment.
  // Finish all writes before reads so SVG layout is calculated once per batch.
  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active || !viewport.current) return;
      fitReaderText(viewport.current.querySelectorAll("[data-fit-size]"));
    };
    loadReaderFont()
      .then(fit)
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [page]);
  const dimensions = pageDimensions(available);
  const framedWidth = page.width + 88;
  const framedHeight = Math.max(
    page.height + 80,
    (minimumHeight * framedWidth) / dimensions.width,
  );
  const pageHeight = (dimensions.width * framedHeight) / framedWidth;
  useEffect(() => {
    if (
      !Capacitor.isNativePlatform() ||
      !interactive ||
      !shareKey ||
      (needsArt && !sakhiArt)
    )
      return;
    if (
      pad.collection
        ? pad.collection !== "kallolini" &&
          collectionMetrics?.id !== `${pad.collection}:${pad.id}`
        : !current
    )
      return;
    warmShareResources().catch(() => {});
    let idle, timer;
    let started = false;
    const cancel = () => {
      clearTimeout(timer);
      if (idle != null) window.cancelIdleCallback?.(idle);
      idle = null;
    };
    const schedule = (event) => {
      cancel();
      if (
        started ||
        document.hidden ||
        event?.touches?.length ||
        viewport.current?.dataset.pinching === "true"
      )
        return;
      timer = setTimeout(
        () => {
          const prepare = () => {
            const svg = viewport.current?.querySelector("svg");
            if (
              !svg ||
              document.hidden ||
              viewport.current?.dataset.pinching === "true"
            )
              return;
            started = true;
            preparePadShare(svg, shareKey).catch(() => {});
          };
          // No deadline that can force PNG work into an active gesture.
          if (window.requestIdleCallback)
            idle = window.requestIdleCallback(prepare);
          else prepare();
        },
        event ? 350 : 0,
      );
    };
    const events = [
      "touchstart",
      "touchmove",
      "touchend",
      "touchcancel",
      "pointerdown",
      "scroll",
      "visibilitychange",
    ];
    events.forEach((type) =>
      window.addEventListener(type, schedule, { passive: true }),
    );
    schedule();
    return () => {
      cancel();
      events.forEach((type) => window.removeEventListener(type, schedule));
    };
  }, [
    current,
    needsArt,
    sakhiArt,
    shareKey,
    pad.collection,
    pad.id,
    collectionMetrics,
    interactive,
    framedHeight,
    dimensions.width,
  ]);
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
        <div className="print-surface">
          <svg
            className="print-page"
            role="document"
            aria-label={
              item?.title || (pad.collection ? pad.title : `पद ${pad.id}`)
            }
            viewBox={`0 0 ${framedWidth} ${framedHeight}`}
            width={dimensions.width}
            height={pageHeight}
            data-content-height={page.height + 80}
            data-layout={current || pad.collection ? "source" : "fallback"}
            data-art-ready={!needsArt || Boolean(sakhiArt)}
            data-art-revision={page.illustrations
              ?.map((image) =>
                [
                  image.sha256,
                  image.x,
                  image.y,
                  image.width,
                  image.height,
                ].join(":"),
              )
              .join("|")}
            data-share-ready={
              (!needsArt || Boolean(sakhiArt)) &&
              (pad.collection
                ? pad.collection === "kallolini" ||
                  collectionMetrics?.id === `${pad.collection}:${pad.id}`
                : Boolean(current))
            }
          >
            <FloralFrame
              width={framedWidth}
              height={framedHeight}
              design={borderIndex}
            />
            <g transform="translate(44 40)">
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
              {page.illustrations?.map((image) => (
                <image
                  key={image.id}
                  href={image.href}
                  x={image.x}
                  y={image.y}
                  width={image.width}
                  height={image.height}
                  preserveAspectRatio="xMidYMid meet"
                  aria-label={image.name}
                />
              ))}
              {page.lines.map((line, index) => (
                <g
                  key={index}
                  className={`print-line print-${line.role}`}
                  role={line.role === "number" ? "heading" : undefined}
                  aria-level={line.role === "number" ? 1 : undefined}
                  data-baseline={line.y}
                  data-text-width={line.textWidth || page.width}
                  data-source-fit={line.sourceFit ? "true" : undefined}
                  data-source-page={line.source?.pdfPage}
                >
                  <PrintLine line={line} width={page.width} />
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

function FittedText({ x, y, fontSize, width, centered = false, children }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      data-fit-x={x}
      data-fit-size={fontSize}
      data-fit-width={width}
      data-fit-centered={String(centered)}
      textAnchor={centered ? "middle" : undefined}
      xmlSpace="preserve"
    >
      {children}
    </text>
  );
}

const PrintLine = memo(function PrintLine({ line, width }) {
  if (line.centered)
    return (
      <FittedText
        x={line.x}
        y={line.y}
        fontSize={line.fontSize}
        width={width - 64}
        centered
      >
        {line.text}
      </FittedText>
    );
  if (!line.segments)
    return (
      <FittedText
        x={line.x}
        y={line.y}
        fontSize={line.fontSize}
        width={line.fitWidth || line.length || width - line.x - 26}
      >
        {line.text}
      </FittedText>
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
      <FittedText
        key={index}
        x={x}
        y={baseline}
        fontSize={
          line.role === "verse"
            ? line.fontSize
            : segment.fontSize || line.fontSize
        }
        width={length}
      >
        {segment.runs
          ? segment.runs.map((run, i) => (
              <tspan
                key={i}
                baselineShift={run.raised && mixed ? "super" : undefined}
                fontSize={run.raised && mixed ? "0.6em" : undefined}
              >
                {run.text}
              </tspan>
            ))
          : segment.text}
      </FittedText>
    );
  });
});
