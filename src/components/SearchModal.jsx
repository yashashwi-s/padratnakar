import { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useSearch } from '../hooks/useSearch';
import indexMap from '../data/index_map.json';

export default function SearchModal() {
  const { searchQuery, searchMode, hymns } = useAppState();
  const dispatch = useAppDispatch();
  const { filteredHymns } = useSearch();

  const [expandedTopic, setExpandedTopic] = useState(null);
  const isSearching = searchQuery.trim().length > 0;

  // ── Build topic tree with actual pad counts ────────────────────────────────
  const topicTree = useMemo(() => {
    return indexMap.topics.map(topic => {
      const topicPads = hymns.filter(h => h.section === topic.name);
      return {
        name: topic.name,
        padCount: topicPads.length,
        startPad: topic.startPad,
        subtopics: (topic.subtopics || []).map(sub => {
          const subPads = topicPads.filter(h => h.subtopic === sub.name);
          return {
            name: sub.name,
            padCount: subPads.length,
            startPad: sub.startPad,
          };
        }),
      };
    });
  }, [hymns]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openPad = (pad) => {
    dispatch({ type: 'SET_ACTIVE_PAD', pad });
  };

  const openFirstPadOf = (sectionName, subtopicName = null) => {
    let pads;
    if (subtopicName) {
      pads = hymns.filter(h => h.section === sectionName && h.subtopic === subtopicName);
    } else {
      pads = hymns.filter(h => h.section === sectionName);
    }
    if (pads.length > 0) {
      dispatch({ type: 'SET_ACTIVE_PAD', pad: pads[0] });
    }
  };

  const toggleTopic = (name) => {
    setExpandedTopic(prev => (prev === name ? null : name));
  };

  return (
    <div className="search-modal-overlay" role="dialog" aria-modal="true">

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="search-modal-header">
        <div className="search-input-wrapper">
          <span className="search-input-icon" aria-hidden="true">⌕</span>
          <input
            type="text"
            className="search-input"
            value={searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
            autoFocus
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}
            >×</button>
          )}
        </div>
        <button
          className="close-modal-btn"
          onClick={() => dispatch({ type: 'CLOSE_SEARCH' })}
        >×</button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="search-modal-body">
        <div className="search-content-inner">

          {isSearching ? (
            /* ── Search Results ─────────────────────────────────────── */
            <div>
              <div className="exact-search-hint">
                {searchMode === 'fuzzy' ? (
                  <>
                    <span>Best matches</span>
                    <button
                      className="exact-search-link"
                      onClick={() => dispatch({ type: 'SET_SEARCH_MODE', mode: 'exact' })}
                    >Exact match</button>
                  </>
                ) : (
                  <>
                    <span>Exact matches</span>
                    <button
                      className="exact-search-link"
                      onClick={() => dispatch({ type: 'SET_SEARCH_MODE', mode: 'fuzzy' })}
                    >Fuzzy match</button>
                  </>
                )}
                <span className="search-result-count">{filteredHymns.length} results</span>
              </div>

              {filteredHymns.length === 0 ? (
                <div className="empty-state compact">
                  <p>No pads found</p>
                </div>
              ) : (
                <div className="search-results">
                  {filteredHymns.slice(0, 200).map(hymn => (
                    <button
                      key={hymn.id}
                      className="pad-card"
                      onClick={() => openPad(hymn)}
                    >
                      <span className="pad-card-num">पद {hymn.id}</span>
                      <span className="pad-card-title">{hymn.title || hymn.verses?.[0] || ''}</span>
                      <span className="pad-card-breadcrumb">
                        {hymn.section}
                        {hymn.subtopic && <> › {hymn.subtopic}</>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Topics Tree (Nested Accordion) ────────────────────── */
            <div className="topics-container">
              {topicTree.map(topic => (
                <div key={topic.name} className="topic-item">
                  {/* Topic header row */}
                  <div className="topic-header-row">
                    <button
                      className="topic-header-main"
                      onClick={() => openFirstPadOf(topic.name)}
                      title={`Go to first pad of ${topic.name}`}
                    >
                      <span className="topic-name">{topic.name}</span>
                      <span className="topic-pad-count">{topic.padCount}</span>
                    </button>

                    {topic.subtopics.length > 0 && (
                      <button
                        className={`topic-expand-btn${expandedTopic === topic.name ? ' open' : ''}`}
                        onClick={() => toggleTopic(topic.name)}
                        aria-label="Expand subtopics"
                      >
                        <span className="topic-arrow">▸</span>
                      </button>
                    )}
                  </div>

                  {/* Subtopics dropdown */}
                  {expandedTopic === topic.name && topic.subtopics.length > 0 && (
                    <div className="subtopics-list">
                      {topic.subtopics.map(sub => (
                        <button
                          key={sub.name}
                          className="subtopic-item"
                          onClick={() => openFirstPadOf(topic.name, sub.name)}
                        >
                          <span className="subtopic-name">{sub.name}</span>
                          <span className="topic-pad-count">{sub.padCount}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
