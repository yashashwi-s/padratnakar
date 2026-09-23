import { useEffect, useMemo, useRef, useState } from "react";
import hymns from "./data/hymns.json";
import { shodashCollection as shodash } from "./lib/corpus";
import indexMap from "./data/index_map.json";
import Icon from "./components/Icon";
import PadTypography from "./components/PadTypography";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  devanagariNumber as dn,
  makeSearchIndex,
  searchPads,
} from "./lib/search";

const index = makeSearchIndex(hymns);
const byId = new Map(hymns.map((p) => [p.id, p]));
const STORAGE = "pad-ratnakar-reader-v3";
function stored() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE) || "null") ||
      JSON.parse(localStorage.getItem("pad-ratnakar-state-v2") || "{}")
    );
  } catch {
    return {};
  }
}
function validRoute(hash) {
  let m = hash.match(/^#\/pad\/(\d+)$/);
  if (m && byId.has(Number(m[1]))) return { mode: "pad", id: Number(m[1]) };
  m = hash.match(/^#\/shodash\/(\d+)$/);
  if (m && Number(m[1]) < shodash.items.length)
    return { mode: "shodash", id: Number(m[1]) };
  return null;
}
function loadRoute() {
  const saved = stored();
  return (
    validRoute(location.hash) ||
    validRoute(saved.route || "") || { mode: "pad", id: 1 }
  );
}
function Modal({ children, onClose, className, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}

function Search({ onClose, onOpen, bookmarks, initialView = "search" }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const [phrase, setPhrase] = useState(false);
  const [limit, setLimit] = useState(60);
  const [cursor, setCursor] = useState(0);
  const [view, setView] = useState(initialView);
  const results = useMemo(() => {
    const found = searchPads(index, query, { section, phrase });
    return view === "bookmarks"
      ? found.filter((r) => bookmarks.includes(r.pad.id))
      : found;
  }, [query, section, phrase, view, bookmarks]);
  function changeQuery(q) {
    setQuery(q);
    setLimit(60);
    setCursor(0);
  }
  return (
    <Modal className="search-dialog" label="पद खोजें" onClose={onClose}>
      <header className="dialog-header">
        <h2>{view === "bookmarks" ? "सहेजे हुए पद" : "पद खोजें"}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="खोज बन्द करें"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="search-field">
        <Icon name="search" />
        <input
          autoFocus
          aria-label="पद संख्या या शब्द"
          placeholder="पद संख्या, शब्द या पंक्ति…"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((i) =>
                Math.min(i + 1, Math.min(limit, results.length) - 1),
              );
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter" && results[cursor])
              onOpen(results[cursor].pad.id);
          }}
          aria-controls="search-results"
          aria-activedescendant={
            results[cursor] ? "result-" + results[cursor].pad.id : undefined
          }
        />
        {query && (
          <button
            className="icon-button"
            aria-label="खोज साफ करें"
            onClick={() => changeQuery("")}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <p className="search-help">
        हिन्दी, English में लिखे हिन्दी शब्द, या १२३ / 123
      </p>
      <div className="search-filters">
        <label>
          <span className="sr-only">विषय</span>
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setLimit(60);
              setCursor(0);
            }}
          >
            <option value="">सभी विषय</option>
            {indexMap.topics.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={phrase}
            onChange={(e) => {
              setPhrase(e.target.checked);
              setCursor(0);
            }}
          />
          पूरा वाक्य
        </label>
        {view === "bookmarks" && (
          <button className="text-button" onClick={() => setView("search")}>
            सभी पद
          </button>
        )}
      </div>
      <div className="result-count" aria-live="polite">
        {dn(results.length)} पद {query ? "मिले" : ""}
      </div>
      <div className="search-results" id="search-results">
        {!query && !section && view === "search" ? (
          <>
            <div className="topic-caption">विषयानुसार पढ़ें</div>
            {indexMap.topics.map((t) => (
              <details className="topic" key={t.name}>
                <summary>
                  {t.name}
                  <span>
                    {dn(t.startPad)}–{dn(t.endPad)}
                  </span>
                </summary>
                <button onClick={() => onOpen(t.startPad)}>
                  यहाँ से पढ़ें <Icon name="right" />
                </button>
                {t.subtopics?.map((s) => (
                  <button key={s.name} onClick={() => onOpen(s.startPad)}>
                    {s.name}
                    <span>
                      {dn(s.startPad)}–{dn(s.endPad)}
                    </span>
                  </button>
                ))}
              </details>
            ))}
          </>
        ) : results.length ? (
          results.slice(0, limit).map((r, i) => (
            <button
              id={"result-" + r.pad.id}
              className={
                "search-result " +
                (query && i === cursor ? "keyboard-current" : "")
              }
              key={r.pad.id}
              onClick={() => onOpen(r.pad.id)}
            >
              <span className="result-number">{dn(r.pad.id)}</span>
              <span>
                <strong>{r.pad.title}</strong>
                <span className="result-snippet">
                  {r.snippet !== r.pad.title ? r.snippet : r.pad.section}
                </span>
              </span>
              <Icon name="right" />
            </button>
          ))
        ) : (
          <div className="empty-message">
            {view === "bookmarks" && !query
              ? "पढ़ते समय सहेजें बटन से पद यहाँ जोड़ें।"
              : "कोई पद नहीं मिला। कम शब्दों से फिर खोजें।"}
          </div>
        )}
        {(query || section || view === "bookmarks") &&
          results.length > limit && (
            <button
              className="more-results"
              onClick={() => setLimit((n) => n + 60)}
            >
              अगले {dn(Math.min(60, results.length - limit))} पद दिखाएँ
            </button>
          )}
      </div>
    </Modal>
  );
}

export default function App() {
  const [route, setRoute] = useState(loadRoute);
  const [overlay, setOverlay] = useState(null);
  const [size, setSize] = useState(() => {
    const s = stored().readerSize;
    return typeof s === "number" && Number.isFinite(s)
      ? Math.max(1, Math.min(2.2, s))
      : 1.25;
  });
  const [bookmarks, setBookmarks] = useState(() => {
    const b = stored().bookmarks;
    return Array.isArray(b) ? b.filter((id) => byId.has(id)) : [];
  });
  const [notice, setNotice] = useState("");
  const item = route.mode === "shodash" ? shodash.items[route.id] : null;
  const pad = byId.get(item?.padId || route.id) || hymns[0];
  const saved = bookmarks.includes(pad.id);
  const position = route.mode === "shodash" ? route.id : pad.id - 1;
  const count = route.mode === "shodash" ? shodash.items.length : hymns.length;
  function go(mode, id) {
    const hash = `#/${mode}/${id}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
    setRoute({ mode, id });
    setOverlay(null);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function step(direction) {
    const next = position + direction;
    if (next >= 0 && next < count)
      go(route.mode, route.mode === "shodash" ? next : hymns[next].id);
  }
  useEffect(() => {
    const update = () => {
      setRoute(validRoute(location.hash) || { mode: "pad", id: 1 });
      setOverlay(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);
  useEffect(() => {
    try {
      const old = stored();
      localStorage.setItem(
        STORAGE,
        JSON.stringify({
          ...old,
          bookmarks,
          readerSize: size,
          route: `#/${route.mode}/${route.id}`,
        }),
      );
    } catch {
      /* Reading stays available when storage is unavailable. */
    }
  }, [bookmarks, size, route]);
  useEffect(() => {
    function keys(e) {
      if (
        overlay ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY"].includes(
          e.target.tagName,
        ) ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const n = position + (e.key === "ArrowLeft" ? -1 : 1);
        if (n >= 0 && n < count) {
          const id = route.mode === "shodash" ? n : hymns[n].id;
          history.pushState(null, "", `#/${route.mode}/${id}`);
          setRoute({ mode: route.mode, id });
          window.scrollTo(0, 0);
        }
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [overlay, position, count, route.mode]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let listener;
    NativeApp.addListener("backButton", ({ canGoBack }) => {
      if (overlay) setOverlay(null);
      else if (canGoBack) window.history.back();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });
    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [overlay]);
  function toggleBookmark() {
    setBookmarks((b) =>
      b.includes(pad.id) ? b.filter((x) => x !== pad.id) : [...b, pad.id],
    );
    setNotice(saved ? "पद सहेजे हुए पदों से हटाया गया।" : "पद सहेज लिया गया।");
  }
  return (
    <div className="app-shell">
      <title>{(item?.title || "पद " + dn(pad.id)) + " · पद रत्नाकर"}</title>
      <a className="skip-link" href="#reading">
        पद पर जाएँ
      </a>
      <header className="app-header">
        <div className="header-inner">
          <button
            className="icon-button menu-button"
            aria-label="सूची खोलें"
            onClick={() => setOverlay("menu")}
          >
            <Icon name="menu" />
          </button>
          <button
            className="brand"
            onClick={() => go("pad", 1)}
            aria-label="पद रत्नाकर — पहला पद"
          >
            <img src="/brand/pad-ratnakar.png" alt="" />
            <span>
              <strong>पद रत्नाकर</strong>
              <small>श्रीहनुमानप्रसाद पोद्दार</small>
            </span>
          </button>
          <button
            className="search-trigger"
            onClick={() => setOverlay("search")}
          >
            <Icon name="search" />
            <span>पद खोजें</span>
          </button>
        </div>
      </header>
      <div className="reader-surround">
        <div className="reading-context">
          <span>{item ? "श्रीराधा-माधव-रस-सुधा · षोडशगीत" : pad.section}</span>
          <span>
            {dn(position + 1)} / {dn(count)}
          </span>
        </div>
        <main id="reading" className="reading-page" tabIndex="-1">
          <div className="reading-toolbar">
            <div
              className="text-size"
              role="group"
              aria-label="अक्षरों का आकार"
            >
              <button
                aria-label="अक्षर छोटे करें"
                disabled={size <= 1}
                onClick={() =>
                  setSize((n) => Math.max(1, Math.round((n - 0.1) * 100) / 100))
                }
              >
                <span>अ</span>
                <Icon name="minus" width="12" height="12" />
              </button>
              <button
                className="size-reset"
                title="सामान्य आकार"
                aria-label="सामान्य अक्षर आकार"
                onClick={() => setSize(1.25)}
              >
                {Math.round((size / 1.25) * 100)}%
              </button>
              <button
                aria-label="अक्षर बड़े करें"
                disabled={size >= 2.2}
                onClick={() =>
                  setSize((n) =>
                    Math.min(2.2, Math.round((n + 0.1) * 100) / 100),
                  )
                }
              >
                <span>अ</span>
                <Icon name="plus" width="12" height="12" />
              </button>
            </div>
            <button
              className={"bookmark-button " + (saved ? "is-saved" : "")}
              onClick={toggleBookmark}
              aria-pressed={saved}
              aria-label={saved ? "सहेजे हुए पदों से हटाएँ" : "यह पद सहेजें"}
            >
              <Icon name="bookmark" fill={saved ? "currentColor" : "none"} />
              <span>{saved ? "सहेजा गया" : "सहेजें"}</span>
            </button>
          </div>
          <article
            className="pad-text"
            style={{ fontSize: `${size}rem` }}
            key={`${route.mode}-${route.id}`}
          >
            <PadTypography pad={pad} collectionItem={item} />
          </article>
          <footer className="page-end">
            <span>
              {item
                ? `पद रत्नाकर · मूल पद ${dn(pad.id)}`
                : pad.subtopic || "पद रत्नाकर"}
            </span>
            {pad.source?.pages?.length > 0 && (
              <span>PDF पृष्ठ {pad.source.pages.map(dn).join(", ")}</span>
            )}
          </footer>
        </main>
        <nav className="pad-navigation" aria-label="पद बदलें">
          <button disabled={position === 0} onClick={() => step(-1)}>
            <Icon name="left" />
            <span>पिछला पद</span>
          </button>
          <button
            className="position-button"
            onClick={() => setOverlay(item ? "contents" : "search")}
          >
            {item
              ? item.role === "opening"
                ? "वन्दना"
                : item.role === "closing"
                  ? "पुष्पिका"
                  : `गीत ${dn(item.number)}`
              : `पद ${dn(pad.id)}`}
            <small>{item ? "क्रम देखें" : "खोजें / विषय देखें"}</small>
          </button>
          <button disabled={position === count - 1} onClick={() => step(1)}>
            <span>अगला पद</span>
            <Icon name="right" />
          </button>
        </nav>
        <div className="reading-help">
          अक्षर बड़े करने से पंक्तियाँ सहज रूप से अगली पंक्ति में आएँगी।
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      {["search", "bookmarks"].includes(overlay) && (
        <Search
          initialView={overlay}
          bookmarks={bookmarks}
          onClose={() => setOverlay(null)}
          onOpen={(id) => go("pad", id)}
        />
      )}
      {overlay === "menu" && (
        <Modal
          className="drawer"
          label="मुख्य सूची"
          onClose={() => setOverlay(null)}
        >
          <header className="drawer-header">
            <img src="/brand/pad-ratnakar.png" alt="पद रत्नाकर" />
            <button
              className="icon-button"
              aria-label="सूची बन्द करें"
              onClick={() => setOverlay(null)}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="drawer-title">पद रत्नाकर</div>
          <p className="drawer-author">श्रीहनुमानप्रसाद पोद्दार</p>
          <nav className="drawer-nav">
            <button
              className={route.mode === "pad" ? "current" : ""}
              onClick={() => go("pad", pad.id)}
            >
              <Icon name="book" />
              <span>
                पद रत्नाकर<small>सम्पूर्ण {dn(hymns.length)} पद</small>
              </span>
            </button>
            <button
              className={item ? "current" : ""}
              onClick={() => go("shodash", 0)}
            >
              <Icon name="book" />
              <span>
                षोडशगीत<small>वन्दना · सोलह गीत · पुष्पिका</small>
              </span>
            </button>
            <button onClick={() => setOverlay("search")}>
              <Icon name="search" />
              <span>खोजें और विषय देखें</span>
            </button>
            <button onClick={() => setOverlay("bookmarks")}>
              <Icon name="bookmark" />
              <span>
                सहेजे हुए पद<small>{dn(bookmarks.length)} पद</small>
              </span>
            </button>
          </nav>
          <p className="drawer-note">शब्द वही, जो पुस्तक में हैं।</p>
        </Modal>
      )}
      {overlay === "contents" && (
        <Modal
          className="contents-dialog"
          label="षोडशगीत क्रम"
          onClose={() => setOverlay(null)}
        >
          <header className="dialog-header">
            <h2>षोडशगीत</h2>
            <button
              className="icon-button"
              aria-label="क्रम बन्द करें"
              onClick={() => setOverlay(null)}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="collection-contents">
            {shodash.items.map((entry, i) => (
              <button
                key={i}
                className={route.id === i ? "current" : ""}
                onClick={() => go("shodash", i)}
              >
                <span>{entry.number ? dn(entry.number) : "—"}</span>
                <span>
                  {entry.title}
                  <small>मूल पद {dn(entry.padId)}</small>
                </span>
                <Icon name="right" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
