import { useEffect, useMemo, useState } from "react";
import { getFootnotes, shodashCollection } from "../lib/corpus";
import { getPrintLayout } from "../lib/print-layout";
import { typographyModel } from "../lib/typography";
import { devanagariNumber as dn } from "../lib/search";
import "./reader-typography.css";

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
  const notes = getFootnotes(pad);
  const headings = item?.headings || pad.headings;
  return (
    <div
      className="pad-typography"
      data-layout={currentLayout ? "source" : "flow"}
    >
      {item?.role === "opening" && (
        <header className="shodash-front">
          <p className="invocation">{shodashCollection.invocation}</p>
          <h1>{shodashCollection.bookTitle}</h1>
          <p className="book-subtitle">[ {shodashCollection.title} ]</p>
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
              {item.title}
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
            {heading}
          </p>
        ))}
      </header>
      <div className="poem-measure">
        <div className="verse-body">
          {stanzas.map((stanza, i) => (
            <div className="stanza" key={i}>
              {stanza.map((line, j) => (
                <p
                  key={j}
                  className={`verse-line ${line.citation ? "verse-citation" : ""} ${line.centered ? "verse-centered" : ""} ${line.segments.length > 1 ? "verse-grouped" : ""}`}
                  style={{
                    "--source-indent": `${Math.min(line.inset, 0.45) * 100}%`,
                    "--source-width": `${Math.max(line.extent, 0.45) * 100}%`,
                  }}
                  data-source-page={line.source?.pdfPage}
                >
                  {line.segments.map((segment, k) => (
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
                  ))}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
      {notes.length > 0 && (
        <aside className="footnotes" aria-label="पाद-टिप्पणियाँ">
          <h2>पाद-टिप्पणी</h2>
          {notes.map((note, index) => (
            <div
              className="footnote"
              key={`${note.ownerPadId}-${note.noteIndex}-${index}`}
            >
              <div>
                {note.lines.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            </div>
          ))}
        </aside>
      )}
      {item?.role === "closing" && (
        <p className="closing-dedication">
          {shodashCollection.closingDedication}
        </p>
      )}
    </div>
  );
}
