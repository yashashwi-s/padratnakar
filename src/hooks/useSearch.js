import { useMemo } from 'react';
import { useAppState } from '../context/AppContext';

/**
 * Comprehensive Devanagari ↔ Latin transliteration using phonetic mapping.
 * Much more robust than a static dictionary — handles arbitrary Hindi words.
 */
const DEVANAGARI_MAP = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'ri': 'ऋ',
  // Consonants (multi-char first for greedy matching)
  'ksh': 'क्ष', 'gya': 'ज्ञ', 'tra': 'त्र', 'shr': 'श्र',
  'shh': 'ष', 'sh': 'श', 'chh': 'छ', 'ch': 'च',
  'th': 'थ', 'dh': 'ध', 'ph': 'फ', 'bh': 'भ',
  'kh': 'ख', 'gh': 'घ', 'jh': 'झ', 'nh': 'ञ',
  'k': 'क', 'g': 'ग', 'j': 'ज', 'n': 'न',
  't': 'त', 'd': 'द', 'p': 'प', 'b': 'ब', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  's': 'स', 'h': 'ह',
};

/**
 * Convert Latin text to possible Devanagari fragments for matching.
 * This is approximate — good enough for fuzzy search.
 */
function latinToDevanagariFragments(text) {
  if (!text) return [];
  const lower = text.toLowerCase().trim();
  const fragments = [lower]; // always include original

  // Try to build a Devanagari version
  let hindi = '';
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    // Try longest match first (3, 2, 1 chars)
    for (let len = 3; len >= 1; len--) {
      const substr = lower.substring(i, i + len);
      if (DEVANAGARI_MAP[substr]) {
        hindi += DEVANAGARI_MAP[substr];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      hindi += lower[i]; // keep unknown chars as-is
      i++;
    }
  }
  if (hindi !== lower) fragments.push(hindi);

  return fragments;
}

function isLatin(str) {
  return /[a-zA-Z]/.test(str);
}

/**
 * Smart search scoring.
 *
 * - EXACT substring match in title: highest score
 * - EXACT substring match in first verse: high score
 * - Pad number match: very high score
 * - Section/subtopic match: medium score
 * - Match in full text: low score
 * - No threshold-based cutoff; only return actual matches
 */
function scoreHymn(hymn, queryTerms) {
  const padId = String(hymn.id);
  const title = (hymn.title || '').toLowerCase();
  const firstVerse = (hymn.verses?.[0] || '').toLowerCase();
  const section = (hymn.section || '').toLowerCase();
  const subtopic = (hymn.subtopic || '').toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    const t = term.toLowerCase();

    // Pad number exact match
    if (padId === t) {
      score += 100;
      continue;
    }
    if (padId.includes(t)) {
      score += 20;
    }

    // Title match (highest content weight)
    if (title.includes(t)) {
      score += 50;
    }

    // Section/subtopic match
    if (section.includes(t)) score += 15;
    if (subtopic.includes(t)) score += 20;

    // First verse match
    if (firstVerse.includes(t)) {
      score += 30;
    }

    // Full text match (only check first 5 verses for performance)
    if (score === 0) {
      const snippet = hymn.verses?.slice(0, 5).join(' ').toLowerCase() || '';
      if (snippet.includes(t)) {
        score += 10;
      }
    }
  }

  return score;
}

export function useSearch() {
  const { hymns, searchQuery, searchMode } = useAppState();

  const filteredHymns = useMemo(() => {
    const query = (searchQuery || '').trim();
    if (!query) return hymns;

    // Build search terms (original + transliterated)
    let queryTerms;
    if (isLatin(query)) {
      queryTerms = latinToDevanagariFragments(query);
    } else {
      queryTerms = [query];
    }

    if (searchMode === 'exact') {
      // Exact: only return pads where the query appears as a substring in content
      return hymns.filter(h => {
        const searchable = [
          h.title, h.section, h.subtopic || '',
          String(h.id),
          ...h.verses.slice(0, 10),
        ].join(' ').toLowerCase();
        return queryTerms.some(t => searchable.includes(t.toLowerCase()));
      });
    }

    // Fuzzy: score and rank
    const scored = hymns
      .map(h => ({ hymn: h, score: scoreHymn(h, queryTerms) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Cap at 50 results — if user wants more, they should refine their search
    return scored.slice(0, 50).map(s => s.hymn);
  }, [hymns, searchQuery, searchMode]);

  return { filteredHymns, resultCount: filteredHymns.length };
}
