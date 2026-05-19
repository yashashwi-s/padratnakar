
import { AppProvider, useAppState, useAppDispatch } from './context/AppContext';
import HymnReader from './components/HymnReader';
import SearchModal from './components/SearchModal';
import { useEffect } from 'react';

function MainApp() {
  const { isSearchOpen, activePad, hymns } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!activePad && hymns && hymns.length > 0) {
      // Find Pad 1 or just the first pad
      const pad1 = hymns.find(h => h.id === 1) || hymns[0];
      if (pad1) {
        dispatch({ type: 'SET_ACTIVE_PAD', pad: pad1 });
      }
    }
  }, [activePad, hymns, dispatch]);

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="top-nav">
        <h1 className="top-nav-title">पद-रत्नाकर</h1>
        <div className="top-nav-actions">
          <button 
            className="nav-btn icon-btn" 
            onClick={() => dispatch({ type: 'TOGGLE_SEARCH' })}
            aria-label="Search and Topics"
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>⌕</span>
          </button>
        </div>
      </header>

      {/* Main Reader View */}
      <main className="reader-container">
        <div className="reader-content-box">
          <HymnReader />
        </div>
      </main>

      {/* Full Screen Search / Topics Modal */}
      {isSearchOpen && <SearchModal />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
