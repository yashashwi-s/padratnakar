import { sharePad, copyPad } from "./lib/share-pad";
import { useReaderSlider } from "./lib/use-reader-slider";
import { swipeDirection, wrappedPosition } from "./lib/reader-layout";
import { useEffect, useMemo, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import hymns from "./data/hymns.json";
import indexMap from "./data/index_map.json";
import { shodashCollection as shodash } from "./lib/corpus";
import {
  devanagariNumber as dn,
  makeSearchIndex,
  searchPads,
} from "./lib/search";
import { findSectionMatches, matchesSectionName } from "./lib/sections";
import Icon from "./components/Icon";
import PadTypography from "./components/PadTypography";

const STORAGE = "pad-ratnakar-reader-v3";
const byId = new Map(hymns.map((pad) => [pad.id, pad]));
const mainIndex = makeSearchIndex(hymns);
const songPosition = new Map(shodash.items.map((item, i) => [item.padId, i]));
const songIndex = makeSearchIndex(
  hymns.map((pad) => {
    const item = shodash.items[songPosition.get(pad.id)];
    return item
      ? {
          ...pad,
          title: item.title,
          section: shodash.title,
          headings: [...(item.headings || []), item.title],
        }
      : pad;
  }),
).filter((entry) => songPosition.has(entry.pad.id));
const collections = [
  {
    mode: "pad",
    name: "पद रत्नाकर",
    index: mainIndex,
    routeId: (id) => id,
    displayNumber: (id) => dn(id),
  },
  {
    mode: "shodash",
    name: "षोडशगीत",
    index: songIndex,
    routeId: (id) => songPosition.get(id),
    displayNumber: (id) => {
      const entry = shodash.items[songPosition.get(id)];
      return entry.number ? dn(entry.number) : "";
    },
  },
];

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
function routePath(mode, id) {
  return `/${mode}/${id}`;
}
function routeUrl(mode, id) {
  const path = routePath(mode, id);
  return Capacitor.isNativePlatform() ? `#${path}` : path;
}
function validRoute(value) {
  const path = (value || "").replace(/^#/, "");
  let match = path.match(/^\/pad\/(\d+)\/?$/);
  if (match && byId.has(Number(match[1])))
    return { mode: "pad", id: Number(match[1]) };
  match = path.match(/^\/shodash\/(\d+)\/?$/);
  if (match && Number(match[1]) < shodash.items.length)
    return { mode: "shodash", id: Number(match[1]) };
  return null;
}
function routeFromLocation() {
  const pathRoute = validRoute(location.pathname);
  const hashRoute = validRoute(location.hash);

  if (!Capacitor.isNativePlatform()) {
    if (pathRoute) {
      // Pretty web routes are canonical. Strip any stale hash fragment.
      if (location.hash)
        history.replaceState(
          history.state,
          "",
          `${location.pathname}${location.search}`,
        );
      return pathRoute;
    }
    if (hashRoute) {
      // One-time compatibility for old /#/pad/... links: redirect without reload.
      history.replaceState(
        history.state,
        "",
        `${routePath(hashRoute.mode, hashRoute.id)}${location.search}`,
      );
      return hashRoute;
    }
    if (location.pathname === "/") return { mode: "pad", id: 1 };
    return null;
  }

  return hashRoute || pathRoute;
}
function loadRoute() {
  return (
    routeFromLocation() ||
    validRoute(stored().route || "") || { mode: "pad", id: 1 }
  );
}
function SectionBar({ children }) {
  return <div className="section-bar">{children}</div>;
}
function PadRow({ number, text, onClick }) {
  return (
    <button className="pad-row" onClick={onClick}>
      <span className="row-number">{number ? `${number}.` : ""}</span>
      <span className="row-text">{text}</span>
    </button>
  );
}
function isMusicalLabel(line) {
  return /^\s*\((?:राग|तर्ज|ताल|दोहा|सोरठा)(?:[\s—–-]|\))/u.test(line);
}
function padPreview(pad) {
  return (
    pad.verses
      .filter((line) => !isMusicalLabel(line))
      .slice(0, 8)
      .join(" ") || pad.title
  );
}
function collectionPreview(item) {
  return (
    item.stanzas
      .flat()
      .filter((line) => !isMusicalLabel(line))
      .slice(0, 8)
      .join(" ") || item.title
  );
}
function searchPreview(mode, result) {
  const pad = result.pad;
  if (mode === "shodash") {
    const item = shodash.items[songPosition.get(pad.id)];
    const lines = item.stanzas.flat();
    const start = lines.indexOf(result.snippet);
    return start >= 0 && !isMusicalLabel(result.snippet)
      ? lines
          .slice(start)
          .filter((line) => !isMusicalLabel(line))
          .slice(0, 8)
          .join(" ")
      : collectionPreview(item);
  }
  const start = pad.verses.indexOf(result.snippet);
  if (start >= 0 && !isMusicalLabel(result.snippet))
    return pad.verses
      .slice(start)
      .filter((line) => !isMusicalLabel(line))
      .slice(0, 8)
      .join(" ");
  if (pad.headings.includes(result.snippet)) return padPreview(pad);
  return [result.snippet, padPreview(pad)].filter(Boolean).join(" ");
}
function SearchResults({ query, origin, onOpen, onOpenSection }) {
  const [limit, setLimit] = useState(60);
  const sectionMatches = useMemo(
    () => findSectionMatches(indexMap.topics, query),
    [query],
  );
  const groups = useMemo(
    () =>
      [...collections]
        .sort((a, b) => (a.mode === origin ? -1 : b.mode === origin ? 1 : 0))
        .map((collection) => ({
          ...collection,
          found: searchPads(collection.index, query),
        })),
    [query, origin],
  );
  if (
    !groups.some(
      (group) =>
        group.found.length ||
        matchesSectionName(group.name, query) ||
        (group.mode === "pad" && sectionMatches.length),
    )
  )
    return (
      <p className="empty-state">कोई पद नहीं मिला। दूसरे शब्दों से खोजें।</p>
    );
  return (
    <div className="list-content" aria-live="polite">
      {groups.map((group) =>
        group.found.length ||
        matchesSectionName(group.name, query) ||
        (group.mode === "pad" && sectionMatches.length) ? (
          <section key={group.mode}>
            <SectionBar>{group.name}</SectionBar>
            {matchesSectionName(group.name, query) && (
              <button
                className="section-row search-section-row"
                onClick={() =>
                  onOpenSection(
                    group.mode === "shodash" ? { mode: "shodash" } : null,
                  )
                }
              >
                {group.name}
              </button>
            )}
            {group.mode === "pad" &&
              sectionMatches.map(({ section, subtopic }) => (
                <button
                  className="section-row search-section-row"
                  key={`${section.name}-${subtopic?.name || ""}`}
                  onClick={() =>
                    onOpenSection(
                      subtopic
                        ? {
                            ...section,
                            startPad: subtopic.startPad,
                            endPad: subtopic.endPad,
                            activeSubtopic: subtopic.name,
                          }
                        : section,
                    )
                  }
                >
                  {section.name}
                  {subtopic ? ` — ${subtopic.name}` : ""}
                </button>
              ))}
            {group.found.slice(0, limit).map((result) => {
              const id = result.pad.id;
              return (
                <PadRow
                  key={group.mode + id}
                  number={group.displayNumber(id)}
                  text={searchPreview(group.mode, result)}
                  onClick={() => onOpen(group.mode, group.routeId(id))}
                />
              );
            })}
            {group.found.length > limit && (
              <button
                className="more-button"
                onClick={() => setLimit((n) => n + 60)}
              >
                और पद देखें
              </button>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(loadRoute);
  const [view, setView] = useState("reader");
  const [selectedSection, setSelectedSection] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOrigin, setSearchOrigin] = useState("pad");
  const [bookmarks, setBookmarks] = useState(() => {
    const values = stored().bookmarks;
    return Array.isArray(values) ? values.filter((id) => byId.has(id)) : [];
  });
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(false);
  const swipeStart = useRef(null);
  const item = route.mode === "shodash" ? shodash.items[route.id] : null;
  const pad = byId.get(item?.padId || route.id) || hymns[0];
  const saved = bookmarks.includes(pad.id);
  const position = route.mode === "shodash" ? route.id : pad.id - 1;
  const count = route.mode === "shodash" ? shodash.items.length : hymns.length;

  const trackRef = useRef(null);
  const slider = useReaderSlider(trackRef, (direction) => {
    const next = wrappedPosition(position, direction, count);
    go(route.mode, route.mode === "shodash" ? next : hymns[next].id);
  });

  function showView(next, section = null) {
    slider.reset();
    if (view === next) return;
    history.pushState(
      { view: next, section, origin: route.mode },
      "",
      location.href,
    );
    setView(next);
    if (next !== "browse") window.scrollTo(0, 0);
  }
  function go(mode, id) {
    slider.reset();
    const url = routeUrl(mode, id);
    const current = Capacitor.isNativePlatform()
      ? location.hash
      : location.pathname;
    if (current !== url || view !== "reader") history.pushState(null, "", url);
    setRoute({ mode, id });
    setView("reader");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function goHome() {
    slider.reset();
    const url = Capacitor.isNativePlatform() ? "#/pad/1" : "/";
    const current = Capacitor.isNativePlatform()
      ? location.hash
      : `${location.pathname}${location.hash}`;
    if (current !== url || view !== "reader") history.pushState(null, "", url);
    setRoute({ mode: "pad", id: 1 });
    setView("reader");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function step(direction) {
    slider.slide(direction);
  }
  function startSwipe(event) {
    swipeStart.current = null;
    if (event.touches.length !== 1) slider.reset();
    if (
      Number(
        event.currentTarget.querySelector(
          '[data-current="true"] .print-viewport',
        )?.dataset.zoom || 1,
      ) > 1.01 ||
      event.touches.length !== 1 ||
      event.target.closest(
        'button,a,input,select,textarea,[contenteditable="true"]',
      ) ||
      !window.getSelection()?.isCollapsed ||
      (window.visualViewport?.scale || 1) > 1.01
    )
      return;
    if (!slider.prepare()) return;
    const touch = event.touches[0];
    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: event.timeStamp,
    };
  }
  function endSwipe(event) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (
      !start ||
      event.changedTouches.length !== 1 ||
      event.currentTarget.querySelector('[data-current="true"] .print-viewport')
        ?.dataset.held === "true" ||
      Number(
        event.currentTarget.querySelector(
          '[data-current="true"] .print-viewport',
        )?.dataset.zoom || 1,
      ) > 1.01
    )
      return;
    const touch = event.changedTouches[0];
    if (event.touches.length) return;
    const direction = swipeDirection(
      start,
      { x: touch.clientX, y: touch.clientY, time: event.timeStamp },
      {
        selection: !window.getSelection()?.isCollapsed,
        scale: window.visualViewport?.scale || 1,
      },
    );
    if (direction)
      slider.slide(
        direction,
        Math.abs(touch.clientX - start.x) /
          Math.max(1, event.timeStamp - start.time),
      );
    else slider.slide(0);
  }
  function moveSwipe(event) {
    const start = swipeStart.current;
    if (!start) return;
    if (event.touches.length !== 1) {
      swipeStart.current = null;
      slider.reset();
      return;
    }
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - start.x),
      dy = Math.abs(touch.clientY - start.y);
    if (dy > 10 && dy > dx) {
      swipeStart.current = null;
      slider.reset();
    } else if (dx > 8 && dx > dy * 1.5) slider.drag(touch.clientX - start.x);
  }

  function openBrowse() {
    setSearchOrigin(route.mode);
    showView("browse");
  }
  function openQuery() {
    setSearchOrigin(route.mode);
    setQuery("");
    showView("query");
    window.scrollTo(0, 0);
  }
  function openSection(section) {
    setSelectedSection(section);
    showView("section", section);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const update = () => {
      setRoute(routeFromLocation() || { mode: "pad", id: 1 });
      setView(history.state?.view || "reader");
      setSelectedSection(history.state?.section || null);
      if (history.state?.origin) setSearchOrigin(history.state.origin);
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
      localStorage.setItem(
        STORAGE,
        JSON.stringify({
          ...stored(),
          bookmarks,
          route: routePath(route.mode, route.id),
        }),
      );
    } catch {
      /* Reading remains available without storage. */
    }
  }, [bookmarks, route]);
  useEffect(() => {
    function keys(event) {
      if (
        view !== "reader" ||
        (window.visualViewport?.scale || 1) > 1.01 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY"].includes(
          event.target.tagName,
        ) ||
        event.target.isContentEditable
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const next = wrappedPosition(
          position,
          event.key === "ArrowLeft" ? -1 : 1,
          count,
        );
        if (next >= 0 && next < count) {
          const id = route.mode === "shodash" ? next : hymns[next].id;
          history.pushState(null, "", routeUrl(route.mode, id));
          setRoute({ mode: route.mode, id });
          window.scrollTo(0, 0);
        }
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [view, position, count, route.mode]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let listener;
    NativeApp.addListener("backButton", ({ canGoBack }) => {
      if (view !== "reader") window.history.back();
      else if (canGoBack) window.history.back();
      else NativeApp.minimizeApp();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });
    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [view]);
  useEffect(() => {
    if (view === "reader") return;
    const escape = (event) => {
      if (event.key === "Escape") history.back();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [view]);
  async function shareCurrentPad() {
    if (sharing) return;
    const svg = document.querySelector('[data-current="true"] .print-page');
    if (!svg || svg.dataset.layout !== "source") {
      setNotice("पद तैयार हो रहा है, कृपया फिर प्रयास करें।");
      return;
    }
    setSharing(true);
    try {
      const result = await sharePad(svg, route.mode, route.id);
      if (result === "copied") setNotice("पद और लिंक कॉपी हो गए।");
      else if (result === "downloaded")
        setNotice("पद की पूरी तस्वीर डाउनलोड हो गई।");
    } catch (error) {
      if (error?.name !== "AbortError" && !/cancel/i.test(error?.message || ""))
        setNotice("साझा नहीं हो सका। कृपया फिर प्रयास करें।");
    } finally {
      setSharing(false);
    }
  }
  async function copyCurrentPad() {
    const lines = [
      ...document.querySelectorAll('[data-current="true"] .print-line'),
    ].map((line) => line.textContent);
    try {
      await copyPad(lines.join("\n"));
      setNotice("पद कॉपी हो गया।");
    } catch {
      setNotice("कॉपी नहीं हो सका। कृपया फिर प्रयास करें।");
    }
  }
  function toggleBookmark() {
    setBookmarks((values) =>
      values.includes(pad.id)
        ? values.filter((id) => id !== pad.id)
        : [...values, pad.id],
    );
    setNotice(saved ? "पद सहेजे हुए पदों से हटाया गया।" : "पद सहेज लिया गया।");
  }
  const selectedPads =
    selectedSection && !selectedSection.mode
      ? hymns.filter(
          (entry) =>
            entry.id >= selectedSection.startPad &&
            entry.id <= selectedSection.endPad,
        )
      : [];
  let subtopic = "";

  return (
    <div className="app-shell">
      <title>
        {(view === "reader"
          ? item?.title || `पद ${dn(pad.id)}`
          : view === "saved"
            ? "सहेजे हुए पद"
            : view === "query"
              ? "पद खोजें"
              : "संग्रह") + " · पद रत्नाकर"}
      </title>
      <a className="skip-link" href="#main-content">
        मुख्य भाग पर जाएँ
      </a>
      <header className="app-header">
        <div className="header-inner">
          <button
            className="header-action"
            aria-label="संग्रह खोलें"
            onClick={() => showView("menu")}
          >
            <Icon name="menu" />
          </button>
          <button
            className="brand-wordmark"
            aria-label="पहले पद पर जाएँ"
            onClick={goHome}
          >
            <span aria-hidden="true">पद रत्नाकर</span>
          </button>
          <button
            className="header-action"
            aria-label="पद खोजें"
            onClick={openBrowse}
          >
            <Icon name="search" />
          </button>
        </div>
      </header>

      {view === "reader" && (
        <>
          <main
            id="main-content"
            className="reader-surround"
            tabIndex="-1"
            onTouchStart={startSwipe}
            onTouchEnd={endSwipe}
            onTouchMove={moveSwipe}
            onTouchCancel={() => {
              swipeStart.current = null;
              slider.reset();
            }}
          >
            <div className="reader-chrome">
              <div className="reader-topline">
                <span>{item ? shodash.title : pad.section}</span>
              </div>
              <div
                className="reading-toolbar"
                role="group"
                aria-label="पढ़ने के विकल्प"
              >
                <button
                  className="toolbar-action"
                  aria-label="पद की तस्वीर साझा करें"
                  disabled={sharing}
                  onClick={shareCurrentPad}
                >
                  <Icon name="share" />
                </button>
                <button
                  className={`toolbar-action save-action ${saved ? "is-saved" : ""}`}
                  aria-label={
                    saved ? "सहेजे हुए पदों से हटाएँ" : "यह पद सहेजें"
                  }
                  aria-pressed={saved}
                  onClick={toggleBookmark}
                >
                  <Icon
                    name="bookmark"
                    fill={saved ? "currentColor" : "none"}
                  />
                </button>
              </div>
            </div>
            <div className="reading-page reader-strip">
              <div className="reader-track" ref={trackRef}>
                {[-1, 0, 1].map((delta) => {
                  const index = wrappedPosition(position, delta, count);
                  const entry =
                    route.mode === "shodash" ? shodash.items[index] : null;
                  const entryPad = entry ? byId.get(entry.padId) : hymns[index];
                  const current = delta === 0;
                  return (
                    <article
                      key={`${route.mode}-${index}`}
                      className={`pad-text reader-panel ${current ? "is-current" : "is-neighbour"}`}
                      data-current={String(current)}
                      aria-hidden={!current}
                      inert={!current}
                      style={{ left: current ? undefined : `${delta * 100}%` }}
                    >
                      <PadTypography
                        pad={entryPad}
                        collectionItem={entry}
                        interactive={current}
                        onCopy={current ? copyCurrentPad : undefined}
                        shareKey={
                          current ? `${route.mode}-${route.id}` : undefined
                        }
                      />
                    </article>
                  );
                })}
              </div>
            </div>
          </main>
          <nav className="bottom-nav" aria-label="पद बदलें">
            <button
              className="saved-nav"
              aria-label="सहेजे हुए पद"
              onClick={() => showView("saved")}
            >
              <Icon name="bookmarks" />
            </button>
            <div className="nav-center">
              <button aria-label="पिछला पद" onClick={() => step(-1)}>
                <Icon name="left" />
              </button>
              <button
                aria-label="संग्रह देखें"
                onClick={() => showView("collections")}
              >
                <Icon name="flower" />
              </button>
              <button aria-label="अगला पद" onClick={() => step(1)}>
                <Icon name="right" />
              </button>
            </div>
          </nav>
        </>
      )}

      {view === "browse" && (
        <div className="browse-backdrop" onClick={() => history.back()}>
          <section
            className="browse-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="विषय और संग्रह"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <button autoFocus className="search-prompt" onClick={openQuery}>
              <Icon name="search" />
              <span>पद खोजें…</span>
            </button>
            <div className="sheet-scroll">
              <SectionBar>संग्रह</SectionBar>
              <button className="section-row" onClick={() => openSection(null)}>
                पद रत्नाकर
              </button>
              <button
                className="section-row"
                onClick={() => openSection({ mode: "shodash" })}
              >
                षोडशगीत
              </button>
              <SectionBar>पद रत्नाकर के विषय</SectionBar>
              {indexMap.topics.map((topic) => (
                <button
                  className="section-row"
                  key={topic.name}
                  onClick={() => openSection(topic)}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === "query" && (
        <main id="main-content" className="list-page">
          <div className="list-heading">
            <button
              className="back-action"
              aria-label="विषयों पर लौटें"
              onClick={() => history.back()}
            >
              <Icon name="left" />
            </button>
            <label className="query-field">
              <Icon name="search" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="पद खोजें…"
                aria-label="पद खोजें"
              />
              {query && (
                <button aria-label="खोज साफ करें" onClick={() => setQuery("")}>
                  <Icon name="close" />
                </button>
              )}
            </label>
          </div>
          {query.trim() ? (
            <SearchResults
              key={query}
              query={query}
              origin={searchOrigin}
              onOpen={go}
              onOpenSection={openSection}
            />
          ) : (
            <p className="search-hint">शब्द, पंक्ति या पद संख्या लिखें।</p>
          )}
        </main>
      )}

      {view === "section" && (
        <main id="main-content" className="list-page">
          <div className="list-heading">
            <button
              className="back-action"
              aria-label="विषयों पर लौटें"
              onClick={() => history.back()}
            >
              <Icon name="left" />
            </button>
            <h1>
              {selectedSection?.mode === "shodash"
                ? "षोडशगीत"
                : selectedSection?.activeSubtopic
                  ? `${selectedSection.name} — ${selectedSection.activeSubtopic}`
                  : selectedSection?.name || "पद रत्नाकर"}
            </h1>
          </div>
          <div className="list-content">
            <SectionBar>
              {selectedSection?.mode === "shodash" ? "षोडशगीत" : "पद रत्नाकर"}
            </SectionBar>
            {selectedSection?.mode === "shodash"
              ? shodash.items.map((entry, i) => (
                  <PadRow
                    key={i}
                    number={entry.number ? dn(entry.number) : ""}
                    text={collectionPreview(entry)}
                    onClick={() => go("shodash", i)}
                  />
                ))
              : selectedSection
                ? selectedPads.map((entry) => {
                    const label = entry.subtopic || "";
                    const showSubtopic = label && label !== subtopic;
                    subtopic = label;
                    return (
                      <div key={entry.id}>
                        {showSubtopic && !selectedSection.activeSubtopic && (
                          <SectionBar>
                            {selectedSection.name} — {label}
                          </SectionBar>
                        )}
                        <PadRow
                          number={dn(entry.id)}
                          text={padPreview(entry)}
                          onClick={() => go("pad", entry.id)}
                        />
                      </div>
                    );
                  })
                : hymns.map((entry) => (
                    <PadRow
                      key={entry.id}
                      number={dn(entry.id)}
                      text={padPreview(entry)}
                      onClick={() => go("pad", entry.id)}
                    />
                  ))}
          </div>
        </main>
      )}

      {view === "saved" && (
        <main id="main-content" className="list-page">
          <div className="list-heading">
            <button
              className="back-action"
              aria-label="पद पर लौटें"
              onClick={() => history.back()}
            >
              <Icon name="left" />
            </button>
            <h1 className="sr-only">सहेजे हुए पद</h1>
          </div>
          {bookmarks.length ? (
            <div className="list-content">
              <SectionBar>पद रत्नाकर</SectionBar>
              {[...bookmarks]
                .sort((a, b) => a - b)
                .map((id) => (
                  <PadRow
                    key={id}
                    number={dn(id)}
                    text={padPreview(byId.get(id))}
                    onClick={() => go("pad", id)}
                  />
                ))}
            </div>
          ) : (
            <p className="empty-state">पढ़ते समय पद सहेजें। वे यहाँ दिखेंगे।</p>
          )}
        </main>
      )}

      {(view === "menu" || view === "collections") && (
        <main id="main-content" className="list-page">
          <div className="list-heading collection-heading-bar">
            <button
              className="back-action"
              aria-label="पद पर लौटें"
              onClick={() => history.back()}
            >
              <Icon name="left" />
            </button>
            <h1 className="sr-only">संग्रह</h1>
          </div>
          <div className="list-content">
            <button className="section-row" onClick={() => go("pad", pad.id)}>
              पद रत्नाकर
            </button>
            <button className="section-row" onClick={() => go("shodash", 0)}>
              षोडशगीत
            </button>
            {view === "menu" && (
              <>
                <button className="section-row" onClick={openBrowse}>
                  विषय देखें
                </button>
              </>
            )}
          </div>
        </main>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
    </div>
  );
}
