import { normalize, romanize } from "./search.js";

export function matchesSectionName(name, query) {
  const term = normalize(query);
  if (!term) return false;
  return (
    normalize(name).includes(term) ||
    (/[a-z]/.test(term) && romanize(name).includes(term))
  );
}

export function findSectionMatches(topics, query) {
  return topics.flatMap((section) => {
    const matches = [];
    if (matchesSectionName(section.name, query))
      matches.push({ section, subtopic: null });
    for (const subtopic of section.subtopics || []) {
      if (matchesSectionName(subtopic.name, query))
        matches.push({ section, subtopic });
    }
    return matches;
  });
}
