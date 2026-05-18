import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialState = {
  // Data
  hymns: [],
  sections: [],
  
  // Navigation
  activePad: null,
  activeSection: null,      // null = all, or section name string
  activeCollection: null,   // null = not viewing collection, or collection id
  activeView: 'all',        // 'all' | 'section' | 'bookmarks' | 'collection'
  
  // Search
  searchQuery: '',
  searchMode: 'fuzzy',      // 'fuzzy' | 'exact'
  
  // Collections
  collections: [],
  bookmarks: [],
  
  // UI
  theme: 'dark',
  fontSize: 1.2,
  sidebarOpen: false,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, hymns: action.hymns, sections: action.sections };
    
    case 'SET_ACTIVE_PAD':
      return { ...state, activePad: action.pad };
    
    case 'SET_VIEW_ALL':
      return { ...state, activeView: 'all', activeSection: null, activeCollection: null };
    
    case 'SET_VIEW_SECTION':
      return { ...state, activeView: 'section', activeSection: action.section, activeCollection: null };
    
    case 'SET_VIEW_BOOKMARKS':
      return { ...state, activeView: 'bookmarks', activeSection: null, activeCollection: null };
    
    case 'SET_VIEW_COLLECTION':
      return { ...state, activeView: 'collection', activeCollection: action.collectionId, activeSection: null };
    
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    
    case 'SET_SEARCH_MODE':
      return { ...state, searchMode: action.mode };
    
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.size };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false };
    
    // Bookmarks
    case 'TOGGLE_BOOKMARK': {
      const id = action.padId;
      const bookmarks = state.bookmarks.includes(id)
        ? state.bookmarks.filter(b => b !== id)
        : [...state.bookmarks, id];
      return { ...state, bookmarks };
    }
    
    // Collections
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.collections };
    
    case 'ADD_COLLECTION': {
      const newCol = {
        id: Date.now().toString(),
        name: action.name,
        pads: [],
        createdAt: new Date().toISOString(),
      };
      return { ...state, collections: [...state.collections, newCol] };
    }
    
    case 'DELETE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter(c => c.id !== action.collectionId),
        activeCollection: state.activeCollection === action.collectionId ? null : state.activeCollection,
        activeView: state.activeCollection === action.collectionId ? 'all' : state.activeView,
      };
    
    case 'RENAME_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(c =>
          c.id === action.collectionId ? { ...c, name: action.name } : c
        ),
      };
    
    case 'ADD_PAD_TO_COLLECTION': {
      return {
        ...state,
        collections: state.collections.map(c => {
          if (c.id !== action.collectionId) return c;
          // Don't add duplicates
          if (c.pads.some(p => p.padId === action.padId)) return c;
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
    }
    
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
    
    case 'UPDATE_COLLECTION_PAD': {
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
    }
    
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Load bookmarks and collections from localStorage on mount
  useEffect(() => {
    try {
      const savedBookmarks = JSON.parse(localStorage.getItem('pad-ratnakar-bookmarks') || '[]');
      const savedCollections = JSON.parse(localStorage.getItem('pad-ratnakar-collections') || '[]');
      const savedTheme = localStorage.getItem('pad-ratnakar-theme') || 'dark';
      const savedFontSize = parseFloat(localStorage.getItem('pad-ratnakar-fontSize') || '1.2');
      
      if (savedBookmarks.length) {
        savedBookmarks.forEach(id => dispatch({ type: 'TOGGLE_BOOKMARK', padId: id }));
      }
      if (savedCollections.length) {
        dispatch({ type: 'SET_COLLECTIONS', collections: savedCollections });
      }
      if (savedTheme !== 'dark') dispatch({ type: 'TOGGLE_THEME' });
      if (savedFontSize !== 1.2) dispatch({ type: 'SET_FONT_SIZE', size: savedFontSize });
    } catch (e) {
      console.warn('Failed to load saved state:', e);
    }
  }, []);
  
  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem('pad-ratnakar-bookmarks', JSON.stringify(state.bookmarks));
  }, [state.bookmarks]);
  
  // Persist collections
  useEffect(() => {
    localStorage.setItem('pad-ratnakar-collections', JSON.stringify(state.collections));
  }, [state.collections]);
  
  // Persist theme
  useEffect(() => {
    localStorage.setItem('pad-ratnakar-theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);
  
  // Persist fontSize
  useEffect(() => {
    localStorage.setItem('pad-ratnakar-fontSize', state.fontSize.toString());
  }, [state.fontSize]);
  
  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
