import { useEffect, useRef, useCallback } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';

/**
 * Convert Arabic numeral to Devanagari.
 */
function toDevanagariNum(n) {
  const map = { '0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९' };
  return String(n).replace(/[0-9]/g, d => map[d]);
}

export default function HymnReader() {
  const { activePad, hymns, bookmarks, fontSize } = useAppState();
  const dispatch = useAppDispatch();
  const contentRef = useRef(null);

  // Scroll to top on pad change
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePad?.id]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const navigatePad = useCallback((direction) => {
    if (!activePad || !hymns.length) return;
    const idx = hymns.findIndex(h => h.id === activePad.id);
    if (idx === -1) return;
    const next = idx + direction;
    if (next >= 0 && next < hymns.length) {
      dispatch({ type: 'SET_ACTIVE_PAD', pad: hymns[next] });
    }
  }, [activePad, hymns, dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') navigatePad(-1);
      if (e.key === 'ArrowRight') navigatePad(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigatePad]);

  // ── Touch / swipe ──────────────────────────────────────────────────────────
  const touchX = useRef(null);
  const touchY = useRef(null);

  const onTouchStart = (e) => {
    touchX.current = e.targetTouches[0].clientX;
    touchY.current = e.targetTouches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      navigatePad(dx < 0 ? 1 : -1);
    }
    touchX.current = null;
  };

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const isBookmarked = activePad ? bookmarks.includes(activePad.id) : false;
  const toggleBookmark = () => {
    if (activePad) dispatch({ type: 'TOGGLE_BOOKMARK', padId: activePad.id });
  };

  // ── Font size ──────────────────────────────────────────────────────────────
  const changeFontSize = (delta) => {
    const next = Math.min(2.5, Math.max(0.8, (fontSize || 1.2) + delta));
    dispatch({ type: 'SET_FONT_SIZE', size: Math.round(next * 10) / 10 });
  };

  if (!activePad) {
    return (
      <div className="empty-state">
        <div className="empty-icon">॥</div>
        <h2>पद-रत्नाकर</h2>
        <p>Search or browse Topics to begin</p>
      </div>
    );
  }

  const currentIdx = hymns.findIndex(h => h.id === activePad.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < hymns.length - 1;

  // Separate raag line from verse lines
  const isRaagLine = (line) => /^\s*\(.+\)\s*$/.test(line.trim()) && line.trim().length < 60;
  const raagLine = activePad.verses.find(v => isRaagLine(v));
  const verseLines = activePad.verses.filter(v => !isRaagLine(v));

  return (
    <div
      ref={contentRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Controls row at top right */}
      <div className="reader-controls" style={{ position: 'absolute', top: 0, right: 0, margin: 0 }}>
        <button onClick={() => navigatePad(-1)} disabled={!hasPrev} className="ctrl-btn">‹</button>
        <button onClick={() => navigatePad(1)} disabled={!hasNext} className="ctrl-btn">›</button>
        <span className="ctrl-divider" />
        <button onClick={toggleBookmark} className={`ctrl-btn ${isBookmarked ? 'bookmarked' : ''}`}>
          {isBookmarked ? '★' : '☆'}
        </button>
        <span className="ctrl-divider" />
        <button onClick={() => changeFontSize(-0.1)} className="ctrl-btn">A−</button>
        <button onClick={() => changeFontSize(+0.1)} className="ctrl-btn">A+</button>
      </div>

      {/* Section breadcrumb */}
      <div className="reader-breadcrumb">
        {activePad.section && <span className="breadcrumb-section">{activePad.section}</span>}
        {activePad.subtopic && (
          <>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-section">{activePad.subtopic}</span>
          </>
        )}
      </div>

      {/* Pad number in Devanagari */}
      <h2 className="reader-pad-number">[{toDevanagariNum(activePad.id)}]</h2>

      {/* Raag/Taal line directly below the number */}
      {raagLine && <div className="reader-raag-line">{raagLine.trim()}</div>}

      {/* Verses */}
      <div className="reader-content" style={{ fontSize: `${fontSize || 1.2}em` }}>
        {verseLines.map((verse, i) => (
          <p key={i} className="verse-line">{verse}</p>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="reader-nav-bottom">
        <button onClick={() => navigatePad(-1)} disabled={!hasPrev} className="ctrl-btn">‹ Previous</button>
        <span className="pad-position">{currentIdx + 1} / {hymns.length}</span>
        <button onClick={() => navigatePad(1)} disabled={!hasNext} className="ctrl-btn">Next ›</button>
      </div>
    </div>
  );
}
