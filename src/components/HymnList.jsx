import { useRef, useState } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useSearch } from '../hooks/useSearch';

export default function HymnList() {
  const { activePad, searchQuery, searchMode, activeView, activeSection, activeCollection, collections } = useAppState();
  const dispatch = useAppDispatch();
  const { filteredHymns, resultCount } = useSearch();
  const listRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  const isCollectionView = activeView === 'collection';
  const activeCol = isCollectionView ? collections.find(c => c.id === activeCollection) : null;

  const handleContextMenu = (e, hymn) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, hymn });
  };

  const handleAddToCollection = (colId, padId) => {
    dispatch({ type: 'ADD_PAD_TO_COLLECTION', collectionId: colId, padId });
    setContextMenu(null);
  };

  const handleRemoveFromCollection = (padId) => {
    dispatch({ type: 'REMOVE_PAD_FROM_COLLECTION', collectionId: activeCollection, padId });
    setContextMenu(null);
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== toIdx && activeCollection) {
      dispatch({
        type: 'REORDER_COLLECTION_PADS',
        collectionId: activeCollection,
        fromIndex: dragIdx,
        toIndex: toIdx,
      });
    }
    setDragIdx(null);
  };

  const getViewTitle = () => {
    if (activeView === 'all') return 'सभी पद';
    if (activeView === 'section') return activeSection;
    if (activeView === 'bookmarks') return 'Saved';
    if (activeView === 'collection' && activeCol) return activeCol.name;
    return 'पद';
  };

  const isSearching = searchQuery.trim().length > 0;
  const isFuzzy = searchMode === 'fuzzy';

  return (
    <div className="pad-list-panel glass-panel">
      {/* View header */}
      <div className="pad-list-header">
        <button className="hamburger-btn" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>☰</button>
        <h3 className="pad-list-title">{getViewTitle()}</h3>
        <span className="pad-count">{resultCount} pads</span>
      </div>

      {/* Search bar */}
      <div className="search-container">
        <div className="search-input-wrap">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search pads..."
            value={searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}>×</button>
          )}
        </div>

        {/* Google-style hint: when searching fuzzy, show option to switch to exact */}
        {isSearching && isFuzzy && (
          <div className="exact-search-hint">
            <span>Showing best matches.</span>
            <button
              className="exact-search-link"
              onClick={() => dispatch({ type: 'SET_SEARCH_MODE', mode: 'exact' })}
            >
              Search exact words instead
            </button>
          </div>
        )}
        {isSearching && !isFuzzy && (
          <div className="exact-search-hint">
            <span>Exact match.</span>
            <button
              className="exact-search-link"
              onClick={() => dispatch({ type: 'SET_SEARCH_MODE', mode: 'fuzzy' })}
            >
              Show all matches
            </button>
          </div>
        )}
      </div>

      {/* Pad list */}
      <div className="pad-list-scroll" ref={listRef}>
        {filteredHymns.length === 0 ? (
          <div className="empty-list">
            <p>No pads found</p>
            {searchQuery && <p className="empty-hint">Try different words or switch search mode</p>}
          </div>
        ) : (
          filteredHymns.map((hymn, idx) => (
            <div
              key={`${hymn.id}-${idx}`}
              className={`pad-item ${activePad?.id === hymn.id ? 'active' : ''} ${dragIdx === idx ? 'dragging' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_PAD', pad: hymn })}
              onContextMenu={e => handleContextMenu(e, hymn)}
              draggable={isCollectionView}
              onDragStart={e => isCollectionView && handleDragStart(e, idx)}
              onDragOver={e => isCollectionView && handleDragOver(e)}
              onDrop={e => isCollectionView && handleDrop(e, idx)}
            >
              {isCollectionView && <span className="drag-handle">⠿</span>}
              <div className="pad-item-main">
                <div className="pad-item-top">
                  <span className="pad-number">{hymn._customNumber || hymn.id}</span>
                </div>
                <div className="pad-item-title">
                  {hymn._customTitle || hymn.title || '—'}
                </div>
                {(hymn.raag || hymn.taal) && (
                  <div className="pad-item-meta">
                    {hymn.raag}{hymn.raag && hymn.taal ? ' · ' : ''}{hymn.taal}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="context-overlay" onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="context-header">Add to Collection</div>
            {collections.length === 0 ? (
              <div className="context-empty">No collections yet</div>
            ) : (
              collections.map(col => (
                <button
                  key={col.id}
                  className="context-item"
                  onClick={() => handleAddToCollection(col.id, contextMenu.hymn.id)}
                >
                  {col.name}
                </button>
              ))
            )}
            {isCollectionView && (
              <>
                <div className="context-divider" />
                <button
                  className="context-item danger"
                  onClick={() => handleRemoveFromCollection(contextMenu.hymn.id)}
                >
                  Remove from Collection
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
