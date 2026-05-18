import { useEffect } from 'react';
import { AppProvider, useAppState, useAppDispatch } from './context/AppContext';
import Sidebar from './components/Sidebar';
import HymnList from './components/HymnList';
import HymnReader from './components/HymnReader';
import hymnsData from './data/hymns.json';
import sectionsData from './data/sections.json';
import './index.css';

function AppInner() {
  const { sidebarOpen } = useAppState();
  const dispatch = useAppDispatch();

  // Load data on mount
  useEffect(() => {
    // Build sections from hymns if sections.json is empty
    let sections = sectionsData || [];
    if (!sections.length && hymnsData.length) {
      const secMap = {};
      hymnsData.forEach(h => {
        const sec = h.section || 'Uncategorized';
        if (!secMap[sec]) secMap[sec] = { name: sec, padCount: 0, startId: h.id, endId: h.id };
        secMap[sec].padCount++;
        secMap[sec].endId = Math.max(secMap[sec].endId, h.id);
      });
      sections = Object.values(secMap);
    }
    dispatch({ type: 'SET_DATA', hymns: hymnsData, sections });
  }, [dispatch]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE_SIDEBAR' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div className="app-layout">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })} />}
      <Sidebar />
      <HymnList />
      <HymnReader />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
