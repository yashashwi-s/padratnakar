import { useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function HymnReader() {
  const { activePad, fontSize, bookmarks, hymns, collections } = useAppState();
  const dispatch = useAppDispatch();
  const contentRef = useRef(null);

  const isBookmarked = activePad ? bookmarks.includes(activePad.id) : false;

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePad?.id]);

  const navigatePad = (direction) => {
    if (!activePad || !hymns.length) return;
    const currentIdx = hymns.findIndex(h => h.id === activePad.id);
    if (currentIdx === -1) return;
    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < hymns.length) {
      dispatch({ type: 'SET_ACTIVE_PAD', pad: hymns[nextIdx] });
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') navigatePad(-1);
      if (e.key === 'ArrowRight') navigatePad(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!activePad) {
    return (
      <div className="reader-panel glass-panel empty-state">
        <div className="empty-icon">॥</div>
        <h2>पद-रत्नाकर</h2>
        <p>Select a pad from the list to begin reading</p>
        <div className="empty-shortcuts">
          <span>← → Navigate</span>
          <span>/ Search</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-panel glass-panel" ref={contentRef}>
      {/* Breadcrumb: section > pad number */}
      <div className="reader-breadcrumb">
        {activePad.section && (
          <button
            className="breadcrumb-section"
            onClick={() => dispatch({ type: 'SET_VIEW_SECTION', section: activePad.section })}
          >
            {activePad.section}
          </button>
        )}
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">पद {activePad._customNumber || activePad.id}</span>
      </div>

      {/* Pad number as the title — like the original app */}
      <h2 className="reader-title">
        पद संख्या {activePad._customNumber || activePad.id}
      </h2>

      {/* Raag/Taal — if present */}
      {(activePad.raag || activePad.taal) && (
        <div className="reader-meta">
          {activePad.raag && <span className="meta-tag">{activePad.raag}</span>}
          {activePad.taal && <span className="meta-tag">{activePad.taal}</span>}
        </div>
      )}

      {/* Controls */}
      <div className="reader-controls">
        <button onClick={() => navigatePad(-1)} title="Previous (←)" className="ctrl-btn">‹ Prev</button>
        <button onClick={() => navigatePad(1)} title="Next (→)" className="ctrl-btn">Next ›</button>
        <div className="ctrl-divider" />
        <button
          onClick={() => dispatch({ type: 'SET_FONT_SIZE', size: Math.max(0.8, fontSize - 0.1) })}
          title="Smaller text"
          className="ctrl-btn"
        >A−</button>
        <button
          onClick={() => dispatch({ type: 'SET_FONT_SIZE', size: Math.min(2.5, fontSize + 0.1) })}
          title="Larger text"
          className="ctrl-btn"
        >A+</button>
        <div className="ctrl-divider" />
        <button
          onClick={() => dispatch({ type: 'TOGGLE_BOOKMARK', padId: activePad.id })}
          title={isBookmarked ? 'Remove from saved' : 'Save'}
          className={`ctrl-btn ${isBookmarked ? 'bookmarked' : ''}`}
        >
          {isBookmarked ? '✦ Saved' : '✦ Save'}
        </button>
        {collections.length > 0 && (
          <div className="ctrl-dropdown">
            <button className="ctrl-btn" title="Add to Collection">+ Collection</button>
            <div className="ctrl-dropdown-content">
              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => dispatch({
                    type: 'ADD_PAD_TO_COLLECTION',
                    collectionId: col.id,
                    padId: activePad.id,
                  })}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verses — the content, simply and cleanly */}
      <div className="reader-content" style={{ fontSize: `${fontSize}em` }}>
        {activePad.verses.map((verse, i) => (
          <p key={i} className="verse-line">{verse}</p>
        ))}
      </div>

      {/* Footnotes */}
      {activePad.footnotes && activePad.footnotes.length > 0 && (
        <div className="reader-footnotes">
          <h4>Footnotes</h4>
          {activePad.footnotes.map((fn, i) => (
            <p key={i} className="footnote">{fn}</p>
          ))}
        </div>
      )}
    </div>
  );
}
