import hymns from "../data/hymns.json" with { type: "json" };
import { shodashCollection, getFootnotes } from "./corpus.js";
import { readerCollections } from "./reader-collections.js";
import { devanagariNumber as dn } from "./search.js";

const byId = new Map(hymns.map((p) => [p.id, p]));
const songPosition = new Map(
  shodashCollection.items.map((item, i) => [item.padId, i]),
);
const songs = shodashCollection.items.map((item) => ({
  ...byId.get(item.padId),
  title: item.title,
  section: shodashCollection.title,
  headings: item.headings || [],
  verses: item.stanzas.flat(),
  searchNumber: item.number || null,
  footnotes: getFootnotes(item.padId),
  footnoteRefs: [],
}));
export const searchCollections = [
  {
    mode: "pad",
    name: "पद रत्नाकर",
    pads: hymns,
    routeId: (id) => id,
    displayNumber: dn,
  },
  {
    mode: "shodash",
    name: shodashCollection.title,
    pads: songs,
    routeId: (id) => songPosition.get(id),
    displayNumber: (id) => {
      const n = shodashCollection.items[songPosition.get(id)].number;
      return n ? dn(n) : "";
    },
  },
  ...Object.entries(readerCollections).map(([mode, c]) => ({
    mode,
    name: c.title,
    sections: c.sections,
    pads: c.pads,
    routeId: (id) => id,
    displayNumber: (id) => {
      const p = c.padById.get(id);
      return p?.printedNumber ? dn(p.printedNumber) : "";
    },
  })),
];
// Send only searchable text, never page geometry, into the worker.
export function searchDocuments() {
  return searchCollections.map((c) => ({
    mode: c.mode,
    pads: c.pads.map((p) => ({
      id: p.id,
      title: p.title,
      section: p.section,
      subtopic: p.subtopic,
      raag: p.raag,
      taal: p.taal,
      form: p.form,
      headings: p.headings,
      verses: p.verses,
      footnotes: p.footnotes,
      footnoteRefs: p.footnoteRefs,
      searchNumber:
        "searchNumber" in p
          ? p.searchNumber
          : (p.printedNumber ?? (p.collection ? null : p.id)),
    })),
  }));
}
