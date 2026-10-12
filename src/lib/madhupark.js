import collection from "../../data/collections/madhupark/collection.json" with { type: "json" };
import { stanzaPage } from "./stanza-page.js";

export const madhupark = collection;
export const madhuparkPads = collection.entries.map((entry) => ({
  ...entry,
  id: entry.sequence,
  collection: "madhupark",
  section: collection.title,
  headings: [],
  verses: entry.blocks.flat(),
  stanzas: entry.blocks,
}));

export function madhuparkPage(pad, measuredWidths = null) {
  const page = stanzaPage(pad, measuredWidths);
  let index = 0;
  for (const line of page.lines) {
    if (line.role === "verse") {
      const source = pad.lines[index++];
      line.source = {
        pdfPage: source.sourcePage,
        bbox: source.sourceRegion,
        precision: source.positionPrecision,
      };
    } else {
      line.source = { pdfPage: pad.sourcePages[0] };
    }
  }
  return page;
}
