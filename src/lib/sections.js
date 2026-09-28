import { matchesSearchName } from "./search.js";
export const matchesSectionName = matchesSearchName;

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
