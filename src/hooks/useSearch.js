import { useMemo } from 'react';
import { useAppState } from '../context/AppContext';

/**
 * Basic Hindi-to-English transliteration map for search.
 * Allows searching Hindi pads by typing in English/Roman script.
 */
const TRANSLITERATION = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'न',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'sa': 'स', 'ha': 'ह',
  'kri': 'कृ', 'shri': 'श्री', 'shree': 'श्री',
  'radha': 'राधा', 'krishna': 'कृष्ण', 'krishn': 'कृष्ण',
  'madhav': 'माधव', 'govind': 'गोविन्द', 'gopal': 'गोपाल',
  'gopi': 'गोपी', 'brij': 'ब्रज', 'braj': 'ब्रज', 'vraj': 'व्रज',
  'vrindavan': 'वृन्दावन', 'vrindaban': 'वृन्दावन',
  'murli': 'मुरली', 'murali': 'मुरली',
  'prem': 'प्रेम', 'bhakti': 'भक्ति', 'bhajan': 'भजन',
  'ram': 'राम', 'sita': 'सीता', 'hari': 'हरि',
  'shyam': 'श्याम', 'syam': 'स्याम', 'naam': 'नाम',
  'vandana': 'वन्दना', 'prarthana': 'प्रार्थना', 'stuti': 'स्तुति',
  'ras': 'रस', 'leela': 'लीला', 'lila': 'लीला',
  'virah': 'विरह', 'milan': 'मिलन',
  'raag': 'राग', 'taal': 'ताल',
  'uddhav': 'उद्धव', 'holi': 'होली',
  'jhulan': 'झूलन', 'kunj': 'कुंज', 'nikunj': 'निकुंज',
  'nath': 'नाथ', 'prabhu': 'प्रभु', 'prabho': 'प्रभो',
  'daya': 'दया', 'kripa': 'कृपा', 'karuna': 'करुणा',
  'pad': 'पद', 'ratnakar': 'रत्नाकर',
};

/**
 * Try to convert an English query into Hindi equivalents for better matching.
 */
function englishToHindiTerms(query) {
  const words = query.toLowerCase().split(/\s+/);
  const hindiTerms = [];
  
  for (const word of words) {
    // Check full word match first
    if (TRANSLITERATION[word]) {
      hindiTerms.push(TRANSLITERATION[word]);
    }
    // Also keep the original English term
    hindiTerms.push(word);
  }
  
  return hindiTerms;
}

function isEnglish(str) {
  return /^[a-zA-Z0-9\s\-_.]+$/.test(str.trim());
}

/**
 * Trigram-based fuzzy search scoring.
 */
function trigrams(str) {
  const s = str.toLowerCase().trim();
  const result = new Set();
  for (let i = 0; i <= s.length - 3; i++) {
    result.add(s.substring(i, i + 3));
  }
  for (let i = 0; i <= s.length - 2; i++) {
    result.add(s.substring(i, i + 2));
  }
  return result;
}

function fuzzyScore(query, text) {
  if (!query || !text) return 0;
  const qTri = trigrams(query);
  const tTri = trigrams(text);
  if (qTri.size === 0) return 0;
  let matches = 0;
  for (const t of qTri) {
    if (tTri.has(t)) matches++;
  }
  return matches / qTri.size;
}

function exactMatch(query, text) {
  if (!query || !text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function useSearch() {
  const { hymns, searchQuery, searchMode, activeView, activeSection, activeCollection, bookmarks, collections } = useAppState();
  
  const filteredHymns = useMemo(() => {
    let pool = hymns;
    
    // Apply view filter first
    if (activeView === 'section' && activeSection) {
      pool = pool.filter(h => h.section === activeSection);
    } else if (activeView === 'bookmarks') {
      pool = pool.filter(h => bookmarks.includes(h.id));
    } else if (activeView === 'collection' && activeCollection) {
      const col = collections.find(c => c.id === activeCollection);
      if (col) {
        const padMap = new Map(pool.map(h => [h.id, h]));
        pool = col.pads
          .map(cp => {
            const hymn = padMap.get(cp.padId);
            if (!hymn) return null;
            return {
              ...hymn,
              _customTitle: cp.customTitle,
              _customNumber: cp.customNumber,
              _collectionIndex: col.pads.indexOf(cp),
            };
          })
          .filter(Boolean);
      } else {
        pool = [];
      }
    }
    
    if (!searchQuery.trim()) return pool;
    
    const query = searchQuery.trim();
    const queryIsEnglish = isEnglish(query);
    const hindiTerms = queryIsEnglish ? englishToHindiTerms(query) : [query];
    
    if (searchMode === 'exact') {
      return pool.filter(h => {
        const searchable = [
          h.title, h.section, h.raag, h.taal, String(h.id), ...h.verses,
        ].join(' ');
        
        // Check original query and Hindi transliterations
        for (const term of hindiTerms) {
          if (exactMatch(term, searchable)) return true;
        }
        return false;
      });
    }
    
    // Fuzzy mode
    const scored = pool.map(h => {
      const searchable = [
        h.title, h.section, h.raag, h.taal, String(h.id), ...h.verses,
      ].join(' ');
      
      let bestScore = 0;
      
      for (const term of hindiTerms) {
        const titleScore = fuzzyScore(term, h.title || '') * 2;
        const fullScore = fuzzyScore(term, searchable);
        const exactBonus = searchable.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
        const score = titleScore + fullScore + exactBonus;
        bestScore = Math.max(bestScore, score);
      }
      
      return { hymn: h, score: bestScore };
    });
    
    return scored
      .filter(s => s.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .map(s => s.hymn);
  }, [hymns, searchQuery, searchMode, activeView, activeSection, activeCollection, bookmarks, collections]);
  
  return { filteredHymns, resultCount: filteredHymns.length };
}
