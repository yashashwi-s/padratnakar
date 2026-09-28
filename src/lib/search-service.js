import { makeSearchIndex, searchPads } from "./search.js";

export function createSearchService(documents) {
  const indexes = documents.map((c) => ({
    mode: c.mode,
    index: makeSearchIndex(c.pads),
  }));
  return (query) =>
    Object.fromEntries(
      indexes.map((c) => [
        c.mode,
        searchPads(c.index, query).map(({ pad, ...result }) => ({
          id: pad.id,
          ...result,
        })),
      ]),
    );
}
