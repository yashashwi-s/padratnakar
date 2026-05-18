import { useState } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';

export default function Sidebar() {
  const { activeView, activeSection, activeCollection, sections, collections, bookmarks, sidebarOpen } = useAppState();
  const dispatch = useAppDispatch();
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [newColName, setNewColName] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);
  const [editingCol, setEditingCol] = useState(null);
  const [editName, setEditName] = useState('');

  const handleCreateCollection = () => {
    if (newColName.trim()) {
      dispatch({ type: 'ADD_COLLECTION', name: newColName.trim() });
      setNewColName('');
      setShowNewCol(false);
    }
  };

  const handleRename = (colId) => {
    if (editName.trim()) {
      dispatch({ type: 'RENAME_COLLECTION', collectionId: colId, name: editName.trim() });
      setEditingCol(null);
      setEditName('');
    }
  };

  const handleDelete = (colId) => {
    if (confirm('Delete this collection?')) {
      dispatch({ type: 'DELETE_COLLECTION', collectionId: colId });
    }
  };

  const handleExport = (col) => {
    const data = JSON.stringify(col, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${col.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">पद-रत्नाकर</h2>
        <button className="sidebar-close" onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}>×</button>
      </div>

      <nav className="sidebar-nav">
        {/* All Pads */}
        <button
          className={`nav-item ${activeView === 'all' ? 'active' : ''}`}
          onClick={() => { dispatch({ type: 'SET_VIEW_ALL' }); dispatch({ type: 'CLOSE_SIDEBAR' }); }}
        >
          <i className="nav-icon">॥</i>
          <span>सभी पद</span>
        </button>

        {/* Bookmarks */}
        <button
          className={`nav-item ${activeView === 'bookmarks' ? 'active' : ''}`}
          onClick={() => { dispatch({ type: 'SET_VIEW_BOOKMARKS' }); dispatch({ type: 'CLOSE_SIDEBAR' }); }}
        >
          <i className="nav-icon">✦</i>
          <span>Saved</span>
          {bookmarks.length > 0 && <span className="nav-badge">{bookmarks.length}</span>}
        </button>

        {/* Sections */}
        <div className="nav-group">
          <button className="nav-group-header" onClick={() => setSectionsExpanded(!sectionsExpanded)}>
            <span>Sections</span>
            <span className={`chevron ${sectionsExpanded ? 'expanded' : ''}`}>▸</span>
          </button>
          {sectionsExpanded && (
            <div className="nav-group-items">
              {sections.map((sec) => (
                <button
                  key={sec.name}
                  className={`nav-sub-item ${activeView === 'section' && activeSection === sec.name ? 'active' : ''}`}
                  onClick={() => { dispatch({ type: 'SET_VIEW_SECTION', section: sec.name }); dispatch({ type: 'CLOSE_SIDEBAR' }); }}
                  title={sec.name}
                >
                  <span className="nav-sub-text">{sec.name}</span>
                  <span className="nav-badge small">{sec.padCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collections */}
        <div className="nav-group">
          <button className="nav-group-header" onClick={() => setCollectionsExpanded(!collectionsExpanded)}>
            <span>My Collections</span>
            <span className={`chevron ${collectionsExpanded ? 'expanded' : ''}`}>▸</span>
          </button>
          {collectionsExpanded && (
            <div className="nav-group-items">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={`nav-sub-item collection-item ${activeView === 'collection' && activeCollection === col.id ? 'active' : ''}`}
                >
                  {editingCol === col.id ? (
                    <div className="col-edit-row">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(col.id)}
                        autoFocus
                        className="col-edit-input"
                      />
                      <button onClick={() => handleRename(col.id)} className="col-btn save">ok</button>
                      <button onClick={() => setEditingCol(null)} className="col-btn cancel">×</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="nav-sub-text col-name-btn"
                        onClick={() => { dispatch({ type: 'SET_VIEW_COLLECTION', collectionId: col.id }); dispatch({ type: 'CLOSE_SIDEBAR' }); }}
                      >
                        {col.name}
                        <span className="nav-badge small">{col.pads.length}</span>
                      </button>
                      <div className="col-actions">
                        <button onClick={() => { setEditingCol(col.id); setEditName(col.name); }} title="Rename" className="col-btn">edit</button>
                        <button onClick={() => handleExport(col)} title="Export" className="col-btn">save</button>
                        <button onClick={() => handleDelete(col.id)} title="Delete" className="col-btn danger">del</button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {showNewCol ? (
                <div className="new-col-form">
                  <input
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                    placeholder="Name..."
                    autoFocus
                    className="col-edit-input"
                  />
                  <button onClick={handleCreateCollection} className="col-btn save">ok</button>
                  <button onClick={() => { setShowNewCol(false); setNewColName(''); }} className="col-btn cancel">×</button>
                </div>
              ) : (
                <button className="nav-sub-item add-col-btn" onClick={() => setShowNewCol(true)}>
                  <span>+ New Collection</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer" />
    </aside>
  );
}
