import collection from "../../data/collections/bhaiji-jayanti/collection.json" with { type: "json" };

export const jayanti = collection;
export const jayantiPads = collection.entries.map((entry) => ({
  ...entry,
  id: entry.sequence,
  collection: "jayanti",
  section: collection.title,
  headings: [],
  verses: entry.blocks.flat(),
  stanzas: entry.blocks,
}));
export const jayantiShortcuts = jayantiPads.slice(15);
export { stanzaPage as jayantiPage } from "./stanza-page.js";
