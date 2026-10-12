import { readerBorderIndex } from "./lib/reader-borders.js";
import { sharePad, copyPad, copiedPadText } from "./lib/share-pad";
import { useReaderSlider } from "./lib/use-reader-slider";
import { swipeDirection, wrappedPosition } from "./lib/reader-layout";
import { useEffect, useMemo, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Analytics } from "@vercel/analytics/react";
import hymns from "./data/hymns.json";
import indexMap from "./data/index_map.json";
import { shodashCollection as shodash } from "./lib/corpus";
import { devanagariNumber as dn } from "./lib/search";
import { searchCollections as collections } from "./lib/search-catalog";
import { useSearch } from "./lib/use-search";
import { findSectionMatches, matchesSectionName } from "./lib/sections";
import SearchSnippet from "./components/SearchSnippet";
import Icon from "./components/Icon";
import ExitDialog from "./components/ExitDialog";
import PadTypography from "./components/PadTypography";
import AudioTransport from "./components/AudioTransport";

import { routePath, validRoute } from "./lib/collection-routes";
import {
  readerCollections,
  collectionPad,
  collectionBookmark,
} from "./lib/reader-collections";

const STORAGE = "pad-ratnakar-reader-v3";
const byId = new Map(hymns.map((pad) => [pad.id, pad]));

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
function routeUrl(mode, id) {
  const path = routePath(mode, id);
  return Capacitor.isNativePlatform() ? `#${path}` : path;
}
function routeFromLocation() {
  const pathRoute = validRoute(location.pathname);
  const hashRoute = validRoute(location.hash);

  if (!Capacitor.isNativePlatform()) {
    if (pathRoute) {
      // Pretty web routes are canonical. Strip any stale hash fragment.
      if (
        location.hash ||
        location.pathname !== routePath(pathRoute.mode, pathRoute.id)
      )
        history.replaceState(
          history.state,
          "",
          `${routePath(pathRoute.mode, pathRoute.id)}${location.search}`,
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
function SearchResults({
  query,
  origin,
  onOpen,
  onOpenSection,
  scope,
  setScope,
  limits,
  setLimits,
}) {
  const { results, loading, error, retry } = useSearch(query);
  const limitsByGroup = limits.query === query ? limits.counts : {};
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
          found: results?.[collection.mode] || [],
          matchedSections: (collection.sections || []).filter((section) =>
            matchesSectionName(section.name, query),
          ),
        })),
    [query, origin, results],
  );
  const visibleGroups = groups.filter(
    (group) => scope === "all" || group.mode === scope,
  );
  const groupsWithMatches = visibleGroups.filter(
    (group) =>
      group.found.length ||
      group.matchedSections.length ||
      matchesSectionName(group.name, query) ||
      (group.mode === "pad" && sectionMatches.length),
  );
  const padCount = groupsWithMatches.reduce(
    (count, group) => count + group.found.length,
    0,
  );
  return (
    <>
      <div className="search-controls">
        <label>
          <span>संग्रह</span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="all">सभी संग्रह</option>
            {collections.map((c) => (
              <option key={c.mode} value={c.mode}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="search-status" role="status" lang="en">
        {loading
          ? "Searching…"
          : error
            ? "Search could not load. Please try again."
            : groupsWithMatches.length
              ? padCount
                ? `${padCount} pads found · ${groupsWithMatches.length} collections`
                : "Related collections or sections found."
              : "No pads found. Try different words."}
      </p>
      {error ? (
        <button className="more-button" onClick={retry}>
          Try again
        </button>
      ) : loading ? null : groupsWithMatches.length ? (
        <div className="list-content">
          {groupsWithMatches.map((group) => (
            <section key={group.mode}>
              <SectionBar>{`${group.name} · ${dn(group.found.length)} पद`}</SectionBar>
              {matchesSectionName(group.name, query) && (
                <button
                  className="section-row search-section-row"
                  onClick={() =>
                    onOpen(
                      group.mode,
                      readerCollections[group.mode]?.firstId ??
                        (group.mode === "shodash" ? 0 : 1),
                    )
                  }
                >
                  {group.name}
                </button>
              )}
              {group.matchedSections.map((section) => (
                <button
                  className="section-row search-section-row"
                  key={section.id}
                  onClick={() =>
                    onOpenSection({ mode: group.mode, sectionId: section.id })
                  }
                >
                  {section.name}
                </button>
              ))}
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
              {group.found
                .slice(0, limitsByGroup[group.mode] || 20)
                .map((result) => {
                  const id = result.pad.id;
                  return (
                    <PadRow
                      key={group.mode + id}
                      number={group.displayNumber(id)}
                      text={
                        <span className="search-result-text">
                          <SearchSnippet
                            text={result.snippet || result.pad.title}
                            query={query}
                          />
                        </span>
                      }
                      onClick={() => onOpen(group.mode, group.routeId(id))}
                    />
                  );
                })}
              {group.found.length > (limitsByGroup[group.mode] || 20) && (
                <button
                  className="more-button"
                  onClick={() =>
                    setLimits({
                      query,
                      counts: {
                        ...limitsByGroup,
                        [group.mode]: (limitsByGroup[group.mode] || 20) + 20,
                      },
                    })
                  }
                >
                  और पद देखें
                </button>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState(loadRoute);
  const [view, setView] = useState("reader");
  const [selectedSection, setSelectedSection] = useState(null);
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [searchLimits, setSearchLimits] = useState({ query: "", counts: {} });
  const [searchOrigin, setSearchOrigin] = useState("pad");
  const [bookmarks, setBookmarks] = useState(() => {
    const values = stored().bookmarks;
    return Array.isArray(values)
      ? values.filter((id) => byId.has(id) || collectionBookmark(id))
      : [];
  });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(timer);
  }, [notice]);
  const [sharing, setSharing] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const swipeStart = useRef(null);
  const queryInputRef = useRef(null);
  const item = route.mode === "shodash" ? shodash.items[route.id] : null;
  const activeCollection = readerCollections[route.mode];
  const pad = activeCollection
    ? collectionPad(route.mode, route.id)
    : byId.get(item?.padId || route.id) || hymns[0];
  const bookmarkId =
    route.mode === "pad" ? pad.id : `${route.mode}:${route.id}`;
  const saved = bookmarks.includes(bookmarkId);
  const position =
    route.mode === "shodash"
      ? route.id
      : activeCollection
        ? activeCollection.indexById.get(pad.id)
        : pad.id - 1;
  const count =
    route.mode === "shodash"
      ? shodash.items.length
      : activeCollection?.pads.length || hymns.length;

  const trackRef = useRef(null);
  const slider = useReaderSlider(trackRef, (direction) => {
    const next = wrappedPosition(position, direction, count);
    go(
      route.mode,
      route.mode === "shodash"
        ? next
        : (activeCollection?.pads[next]?.id ?? next + 1),
    );
  });

  function showView(next, section = null) {
    slider.reset();
    if (view === next && next !== "section") return;
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
    if (count <= 1) return;
    slider.slide(direction);
  }
  function startSwipe(event) {
    swipeStart.current = null;
    if (count <= 1) return;
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
    const touch = event.touches[0];
    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: event.timeStamp,
      horizontal: false,
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
    if (!start.horizontal) return;
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
    } else if (dx > 8 && dx > dy * 1.5) {
      if (!start.horizontal) {
        if (!slider.prepare()) return;
        start.horizontal = true;
      }
      slider.drag(touch.clientX - start.x);
    }
  }

  function openBrowse() {
    setSearchOrigin(route.mode);
    showView("browse");
  }
  function openQuery() {
    if (view === "query") {
      queryInputRef.current?.focus();
      return;
    }
    setSearchOrigin(route.mode);
    setQuery("");
    setSearchScope("all");
    setSearchLimits({ query: "", counts: {} });
    history.replaceState(null, "", location.href);
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
        exitOpen ||
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
          const id =
            route.mode === "shodash"
              ? next
              : (activeCollection?.pads[next]?.id ?? next + 1);
          history.pushState(null, "", routeUrl(route.mode, id));
          setRoute({ mode: route.mode, id });
          window.scrollTo(0, 0);
        }
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [view, exitOpen, position, count, route.mode, activeCollection]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let listener;
    NativeApp.addListener("backButton", () => {
      if (exitOpen) setExitOpen(false);
      else if (view !== "reader") {
        history.replaceState(null, "", location.href);
        setView("reader");
      } else setExitOpen(true);
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });
    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [view, exitOpen]);
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
      setNotice("The pad is still loading. Please try again.");
      return;
    }
    setSharing(true);
    try {
      const result = await sharePad(svg, route.mode, route.id);
      if (result === "copied") setNotice("Text and link copied to clipboard.");
      else if (result === "downloaded") setNotice("Pad image downloaded.");
    } catch (error) {
      if (error?.name !== "AbortError" && !/cancel/i.test(error?.message || ""))
        setNotice("Could not share. Please try again.");
    } finally {
      setSharing(false);
    }
  }
  async function copyCurrentPad() {
    const lines = [
      ...document.querySelectorAll('[data-current="true"] .print-line'),
    ].map((line) => line.textContent);
    try {
      await copyPad(copiedPadText(lines.join("\n"), route.mode, route.id));
      setNotice("Text copied to clipboard.");
    } catch {
      setNotice("Could not copy. Please try again.");
    }
  }
  function toggleBookmark() {
    setBookmarks((values) =>
      values.includes(bookmarkId)
        ? values.filter((id) => id !== bookmarkId)
        : [...values, bookmarkId],
    );
    setNotice(saved ? "Bookmark removed." : "Bookmark saved.");
  }
  const selectedPads =
    selectedSection && !selectedSection.mode
      ? hymns.filter(
          (entry) =>
            entry.id >= selectedSection.startPad &&
            entry.id <= selectedSection.endPad,
        )
      : [];
  const selectedCollection = readerCollections[selectedSection?.mode];
  const selectedCollectionSection = selectedCollection?.sections.find(
    (section) => section.id === selectedSection?.sectionId,
  );
  let subtopic = "";

  return (
    <div className="app-shell">
      <title>
        {(view === "reader"
          ? item?.title || (activeCollection ? pad.title : `पद ${dn(pad.id)}`)
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
            aria-expanded={view === "menu"}
            onClick={() =>
              view === "menu" ? history.back() : showView("menu")
            }
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
            onClick={openQuery}
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
                <span className="topline-collection">
                  {item
                    ? shodash.title
                    : activeCollection?.title || "पद रत्नाकर"}
                </span>
                {!item &&
                  (!activeCollection ||
                    activeCollection.sections.length > 0) && (
                    <button
                      className="topline-section"
                      aria-label="विषय और उपविषय खोलें"
                      onClick={openBrowse}
                    >
                      <span>
                        {[pad.section, pad.subtopic]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <Icon name="down" className="section-chevron" />
                    </button>
                  )}
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
                {(count === 1 ? [0] : [-1, 0, 1]).map((delta) => {
                  const index = wrappedPosition(position, delta, count);
                  const entry =
                    route.mode === "shodash" ? shodash.items[index] : null;
                  const entryPad = entry
                    ? byId.get(entry.padId)
                    : activeCollection
                      ? activeCollection.pads[index]
                      : hymns[index];
                  const current = delta === 0;
                  return (
                    <article
                      key={`${route.mode}-${index}${count < 3 ? `-${delta}` : ""}`}
                      className={`pad-text reader-panel ${current ? "is-current" : "is-neighbour"}`}
                      data-current={String(current)}
                      aria-hidden={!current}
                      inert={!current}
                      style={{ left: current ? undefined : `${delta * 100}%` }}
                    >
                      <PadTypography
                        pad={entryPad}
                        collectionItem={entry}
                        borderIndex={readerBorderIndex(route.mode, index)}
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
            {route.mode === "shodash" && (
              <AudioTransport
                onNotice={setNotice}
                id={route.id}
                onAdvance={() => step(1)}
              />
            )}
            <button
              className="saved-nav"
              aria-label="सहेजे हुए पद"
              onClick={() => showView("saved")}
            >
              <Icon name="bookmarks" />
            </button>
            <div className="nav-center">
              <button
                aria-label="पिछला पद"
                disabled={count <= 1}
                onClick={() => step(-1)}
              >
                <Icon name="left" />
              </button>
              <button
                aria-label="संग्रह देखें"
                onClick={() => showView("collections")}
              >
                <Icon name="flower" />
              </button>
              <button
                aria-label="अगला पद"
                disabled={count <= 1}
                onClick={() => step(1)}
              >
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
              <SectionBar>
                {activeCollection?.title || "पद रत्नाकर"} के विषय
              </SectionBar>
              {(activeCollection?.sections.length
                ? activeCollection.sections.map((section) => {
                    const entries = activeCollection.pads.filter(
                      (entry) => entry.sectionId === section.id,
                    );
                    return {
                      ...section,
                      startPad: entries[0]?.printedNumber || entries[0]?.id,
                      endPad:
                        entries.at(-1)?.printedNumber || entries.at(-1)?.id,
                    };
                  })
                : indexMap.topics
              ).map((topic) => (
                <button
                  className="section-row"
                  key={topic.name}
                  onClick={() =>
                    openSection(
                      activeCollection?.sections.length
                        ? { mode: route.mode, sectionId: topic.id }
                        : topic,
                    )
                  }
                >
                  {topic.name}
                  <small className="section-range">
                    पद {dn(topic.startPad)}–{dn(topic.endPad)}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === "query" && (
        <main id="main-content" className="list-page">
          <h1 className="sr-only">पद खोजें</h1>
          <div className="list-heading">
            <button
              className="back-action"
              aria-label="पद पर लौटें"
              onClick={() => {
                history.replaceState(null, "", location.href);
                setView("reader");
              }}
            >
              <Icon name="left" />
            </button>
            <label className="query-field">
              <Icon name="search" />
              <input
                autoFocus
                ref={queryInputRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="पद खोजें…"
                aria-label="पद खोजें"
              />
              {query && (
                <button
                  aria-label="खोज साफ करें"
                  onClick={() => {
                    setQuery("");
                    requestAnimationFrame(() => queryInputRef.current?.focus());
                  }}
                >
                  <Icon name="close" />
                </button>
              )}
            </label>
          </div>
          {query.trim() ? (
            <SearchResults
              query={query}
              scope={searchScope}
              setScope={setSearchScope}
              limits={searchLimits}
              setLimits={setSearchLimits}
              origin={searchOrigin}
              onOpen={go}
              onOpenSection={openSection}
            />
          ) : (
            <p className="search-hint" lang="en">
              Enter words in Hindi or English, or a pad number. Use “ ” to
              search for an exact phrase.
            </p>
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
              {readerCollections[selectedSection?.mode]
                ? selectedCollectionSection?.name ||
                  readerCollections[selectedSection.mode].title
                : selectedSection?.mode === "shodash"
                  ? "षोडशगीत"
                  : selectedSection?.activeSubtopic
                    ? `${selectedSection.name} — ${selectedSection.activeSubtopic}`
                    : selectedSection?.name || "पद रत्नाकर"}
            </h1>
          </div>
          <div className="list-content">
            <SectionBar>
              {readerCollections[selectedSection?.mode]
                ? selectedCollectionSection?.name ||
                  readerCollections[selectedSection.mode].title
                : selectedSection?.mode === "shodash"
                  ? "षोडशगीत"
                  : "पद रत्नाकर"}
            </SectionBar>
            {readerCollections[selectedSection?.mode]
              ? selectedCollection.sections.length && !selectedSection.sectionId
                ? selectedCollection.sections.map((section) => (
                    <button
                      className="section-row"
                      key={section.id}
                      onClick={() =>
                        openSection({
                          mode: selectedSection.mode,
                          sectionId: section.id,
                        })
                      }
                    >
                      {section.name}
                      <small className="section-range">
                        {(() => {
                          const entries = selectedCollection.pads.filter(
                            (entry) => entry.sectionId === section.id,
                          );
                          return `पद ${dn(entries[0]?.printedNumber || entries[0]?.id)}–${dn(entries.at(-1)?.printedNumber || entries.at(-1)?.id)}`;
                        })()}
                      </small>
                    </button>
                  ))
                : selectedCollection.pads
                    .filter(
                      (entry) =>
                        !selectedSection.sectionId ||
                        entry.sectionId === selectedSection.sectionId,
                    )
                    .map((entry) => (
                      <PadRow
                        key={entry.id}
                        number={
                          entry.printedNumber ? dn(entry.printedNumber) : ""
                        }
                        text={padPreview(entry)}
                        onClick={() => go(selectedSection.mode, entry.id)}
                      />
                    ))
              : selectedSection?.mode === "shodash"
                ? shodash.items.map((entry, i) => (
                    <PadRow
                      key={i}
                      number={entry.number ? dn(entry.number) : ""}
                      text={collectionPreview(entry)}
                      onClick={() => go("shodash", i)}
                    />
                  ))
                : selectedSection
                  ? selectedSection.subtopics?.length &&
                    !selectedSection.activeSubtopic
                    ? selectedSection.subtopics.map((sub) => (
                        <button
                          className="section-row"
                          key={sub.name}
                          onClick={() =>
                            openSection({
                              ...selectedSection,
                              startPad: sub.startPad,
                              endPad: sub.endPad,
                              activeSubtopic: sub.name,
                            })
                          }
                        >
                          {sub.name}
                          <small className="section-range">
                            पद {dn(sub.startPad)}–{dn(sub.endPad)}
                          </small>
                        </button>
                      ))
                    : selectedPads.map((entry) => {
                        const label = entry.subtopic || "";
                        const showSubtopic = label && label !== subtopic;
                        subtopic = label;
                        return (
                          <div key={entry.id}>
                            {showSubtopic &&
                              !selectedSection.activeSubtopic && (
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
              {collections.map((collection) => {
                const savedItems = bookmarks
                  .filter((value) =>
                    collection.mode === "pad"
                      ? typeof value === "number"
                      : typeof value === "string" &&
                        value.startsWith(`${collection.mode}:`),
                  )
                  .sort((a, b) =>
                    String(a).localeCompare(String(b), "en", { numeric: true }),
                  );
                if (!savedItems.length) return null;
                return (
                  <section key={collection.mode}>
                    <SectionBar>{collection.name}</SectionBar>
                    {savedItems.map((value) => {
                      const id =
                        typeof value === "number"
                          ? value
                          : collectionBookmark(value).id;
                      return (
                        <PadRow
                          key={value}
                          number={
                            collection.mode === "pad"
                              ? dn(id)
                              : collection.mode === "shodash"
                                ? shodash.items[id].number
                                  ? dn(shodash.items[id].number)
                                  : ""
                                : ""
                          }
                          text={
                            collection.mode === "pad"
                              ? padPreview(byId.get(id))
                              : collection.mode === "shodash"
                                ? collectionPreview(shodash.items[id])
                                : padPreview(collectionBookmark(value).pad)
                          }
                          onClick={() => go(collection.mode, id)}
                        />
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">
              Bookmark pads while reading. They will appear here.
            </p>
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
            <button className="section-row" onClick={() => go("pad", 1)}>
              पद रत्नाकर
            </button>
            <button className="section-row" onClick={() => go("shodash", 0)}>
              षोडशगीत
            </button>
            {Object.entries(readerCollections).map(([mode, collection]) => (
              <div key={mode}>
                <button
                  className="section-row"
                  onClick={() => go(mode, collection.firstId)}
                >
                  {collection.title}
                </button>
                {(collection.shortcuts || []).map((entry) => (
                  <button
                    key={entry.id}
                    className="section-row"
                    onClick={() => go(mode, entry.id)}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </main>
      )}
      <div
        className={`reader-toast ${notice ? "is-visible" : ""}`}
        lang="en"
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
      {exitOpen && (
        <ExitDialog
          onCancel={() => setExitOpen(false)}
          onExit={() => NativeApp.exitApp()}
        />
      )}
      {!Capacitor.isNativePlatform() && <Analytics />}
    </div>
  );
}
