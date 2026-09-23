import { useEffect, useMemo, useState, useRef } from "react";
import { getFootnotes, shodashCollection } from "../lib/corpus";
import { getPrintLayout } from "../lib/print-layout";
import {
  normalizeOpeningQuotes,
  normalizeTypographyStanzas,
  normalizeTextLines,
  typographyModel,
} from "../lib/typography";
import { devanagariNumber as dn } from "../lib/search";
import "./reader-typography.css";
import { useReaderLayout } from "./useReaderLayout";

export default function PadTypography({ pad, collectionItem: item }) {
  const [layout, setLayout] = useState(null);
  useEffect(() => {
    let active = true;
    getPrintLayout(pad.id)
      .then((value) => {
        if (active) setLayout(value);
      })
      .catch(() => {
        /* The complete text remains readable without geometry. */
      });
    return () => {
      active = false;
    };
  }, [pad.id]);
  const currentLayout = layout?.padId === pad.id ? layout : null;
  const stanzas = useMemo(
    () => typographyModel(pad, currentLayout, item),
    [pad, currentLayout, item],
  );
  const displayStanzas = useMemo(
    () => normalizeTypographyStanzas(stanzas),
    [stanzas],
  );
  const measureRef = useRef(null);
  useReaderLayout(measureRef, displayStanzas);
  const notes = getFootnotes(pad);
  const headings = item?.headings || pad.headings;
  return (
    <div
      className="pad-typography"
      data-layout={currentLayout ? "source" : "flow"}
    >
      {item?.role === "opening" && (
        <header className="shodash-front">
          <p className="invocation">
            {normalizeOpeningQuotes(shodashCollection.invocation)}
          </p>
          <h1>{shodashCollection.bookTitle}</h1>
          <p className="book-subtitle">
            [ {normalizeOpeningQuotes(shodashCollection.title)} ]
          </p>
        </header>
      )}
      <header className="poem-heading">
        {item ? (
          <>
            <div className="collection-number">
              {item.number ? `(${dn(item.number)})` : null}
            </div>
            <h2
              className={`collection-heading ${item.role === "song" ? "speaker-heading" : ""}`}
            >
              {normalizeOpeningQuotes(item.title)}
            </h2>
          </>
        ) : (
          <h1 className="pad-number">[ {dn(pad.id)} ]</h1>
        )}
        {headings.map((heading, index) => (
          <p
            key={index}
            className={
              /^\(/u.test(heading) ? "musical-heading" : "extra-heading"
            }
          >
            {normalizeOpeningQuotes(heading)}
          </p>
        ))}
      </header>
      <div className="poem-measure" ref={measureRef}>
        <div className="verse-body">
          {displayStanzas.map((stanza, i) => (
            <div className="stanza" key={i}>
              {stanza.map((line, j) => (
                <div
                  className="verse-row"
                  key={j}
                  data-inset={line.inset}
                  data-extent={line.extent}
                  data-centered={Boolean(line.centered)}
                  data-citation={Boolean(line.citation)}
                  data-groups={line.segments.length}
                  data-words={line.text.trim().split(/\s+/u).length}
                >
                  <p
                    className="verse-line"
                    data-source-page={line.source?.pdfPage}
                  >
                    <LineContent segments={line.segments} />
                  </p>
                  <div className="line-metric-clip" aria-hidden="true">
                    <div className="line-metric">
                      <LineContent segments={line.segments} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {notes.length > 0 && item?.role !== "closing" && (
        <aside className="footnotes" aria-label="पाद-टिप्पणियाँ">
          {notes.map((note, index) => (
            <div
              className="footnote"
              key={`${note.ownerPadId}-${note.noteIndex}-${index}`}
            >
              <div>
                {normalizeTextLines(note.lines).map((line, j) => (
                  <p key={j}>{normalizeOpeningQuotes(line)}</p>
                ))}
              </div>
            </div>
          ))}
        </aside>
      )}
      {item?.role === "closing" && (
        <p className="closing-dedication">
          {normalizeOpeningQuotes(shodashCollection.closingDedication)}
        </p>
      )}
    </div>
  );
}

function LineContent({ segments }) {
  return segments.map((segment, k) => (
    <span className="verse-segment" key={k}>
      {segment.runs
        ? segment.runs.map((run, n) =>
            run.raised ? (
              <sup key={n} className="verse-raised">
                {run.text}
              </sup>
            ) : (
              <span key={n}>{run.text}</span>
            ),
          )
        : segment.text}
    </span>
  ));
}
