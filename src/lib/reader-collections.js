import { jayanti, jayantiPads } from "./jayanti.js";
import { kallolini, kalloliniPads } from "./kallolini.js";

export const readerCollections = {
  jayanti: { title: jayanti.title, pads: jayantiPads, sections: [] },
  kallolini: {
    title: kallolini.title,
    pads: kalloliniPads,
    sections: kallolini.sections,
  },
};
export function collectionPad(mode, id) {
  return readerCollections[mode]?.pads.find((pad) => pad.id === id) || null;
}
export function collectionBookmark(value) {
  if (typeof value !== "string") return null;
  const match = /^(jayanti|kallolini):(\d+)$/.exec(value);
  if (!match) return null;
  const mode = match[1],
    id = Number(match[2]);
  const pad = collectionPad(mode, id);
  return pad ? { mode, id, pad, title: readerCollections[mode].title } : null;
}
