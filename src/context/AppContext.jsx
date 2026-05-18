import { createContext, useContext, useReducer, useEffect } from 'react';
import hymnsData from '../data/hymns.json';
import sectionsData from '../data/sections.json';

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialState = {
  // Data (loaded from JSON at startup)
  hymns: hymnsData,
  sections: sectionsData,

  // Navigation
  activePad: null,          // null = none selected
  activeSection: null,      // string section name or null
  activeSubtopic: null,     // string subtopic or null

  // Search Modal
  isSearchOpen: false,
  searchQuery: '',
  searchMode: 'fuzzy',      // 'fuzzy' | 'exact'

  // Collections (user-defined groupings of pads)
  collections: [],

  // Bookmarks (array of pad IDs)
  bookmarks: [],

  // Reader preferences
  fontSize: 1.2,            // em multiplier applied to verses
};

function reducer(state, action) {
  switch (action.type) {

    // ── Navigation ──────────────────────────────────────────────────────────
    case 'SET_ACTIVE_PAD':
      return { ...state, activePad: action.pad, isSearchOpen: false };

    case 'CLEAR_ACTIVE_PAD':
      return { ...state, activePad: null };

    case 'SET_VIEW_SECTION':
      return {
        ...state,
        activeSection: action.section,
        activeSubtopic: action.subtopic || null,
        isSearchOpen: false,
      };

    case 'CLEAR_SECTION':
      return { ...state, activeSection: null, activeSubtopic: null };

    // ── Search Modal ──────────────────────────────────────────────────────────
    case 'OPEN_SEARCH':
      return { ...state, isSearchOpen: true };

    case 'CLOSE_SEARCH':
      return { ...state, isSearchOpen: false, searchQuery: '' };

    case 'TOGGLE_SEARCH':
      return { ...state, isSearchOpen: !state.isSearchOpen, searchQuery: state.isSearchOpen ? '' : state.searchQuery };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };

    case 'SET_SEARCH_MODE':
      return { ...state, searchMode: action.mode };

    // ── Bookmarks ─────────────────────────────────────────────────────────────
    case 'TOGGLE_BOOKMARK': {
      const id = action.padId;
      const bookmarks = state.bookmarks.includes(id)
        ? state.bookmarks.filter(b => b !== id)
        : [...state.bookmarks, id];
      return { ...state, bookmarks };
    }

    // ── Collections ───────────────────────────────────────────────────────────
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.collections };

    case 'ADD_COLLECTION': {
      const newCol = {
        id: Date.now().toString(),
        name: action.name,
        description: action.description || '',
        pads: [],
        createdAt: new Date().toISOString(),
      };
      return { ...state, collections: [...state.collections, newCol] };
    }

    case 'DELETE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter(c => c.id !== action.collectionId),
      };

    case 'RENAME_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(c =>
          c.id === action.collectionId ? { ...c, name: action.name } : c
        ),
      };

    case 'ADD_PAD_TO_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(c => {
          if (c.id !== action.collectionId) return c;
          if (c.pads.some(p => p.padId === action.padId)) return c; // no duplicates
          return {
            ...c,
            pads: [...c.pads, {
              padId: action.padId,
              customTitle: action.customTitle || null,
              customNumber: action.customNumber || null,
            }],
          };
        }),
      };

    case 'REMOVE_PAD_FROM_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(c => {
          if (c.id !== action.collectionId) return c;
          return { ...c, pads: c.pads.filter(p => p.padId !== action.padId) };
        }),
      };

    case 'REORDER_COLLECTION_PADS': {
      return {
        ...state,
        collections: state.collections.map(c => {
          if (c.id !== action.collectionId) return c;
          const pads = [...c.pads];
          const [moved] = pads.splice(action.fromIndex, 1);
          pads.splice(action.toIndex, 0, moved);
          return { ...c, pads };
        }),
      };
    }

    case 'UPDATE_COLLECTION_PAD':
      return {
        ...state,
        collections: state.collections.map(c => {
          if (c.id !== action.collectionId) return c;
          return {
            ...c,
            pads: c.pads.map(p =>
              p.padId === action.padId
                ? { ...p, customTitle: action.customTitle ?? p.customTitle, customNumber: action.customNumber ?? p.customNumber }
                : p
            ),
          };
        }),
      };

    // ── Reader Preferences ────────────────────────────────────────────────────
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.size };

    default:
      return state;
  }
}

const STORAGE_KEY = 'pad-ratnakar-state-v2';

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
      fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 1.2,
    };
  } catch {
    return {};
  }
}

export function AppProvider({ children }) {
  const persisted = loadPersistedState();
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    ...persisted,
  });

  // Auto-open Pad 1 on first load if no pad is active
  useEffect(() => {
    if (!state.activePad && state.hymns.length > 0) {
      const pad1 = state.hymns.find(h => h.id === 1) || state.hymns[0];
      if (pad1) dispatch({ type: 'SET_ACTIVE_PAD', pad: pad1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist bookmarks, collections, fontSize
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bookmarks: state.bookmarks,
        collections: state.collections,
        fontSize: state.fontSize,
      }));
    } catch { /* quota exceeded or private mode */ }
  }, [state.bookmarks, state.collections, state.fontSize]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
