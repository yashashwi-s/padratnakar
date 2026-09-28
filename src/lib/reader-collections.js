import {
  jayanti,
  jayantiPads,
  jayantiPage,
  jayantiShortcuts,
} from "./jayanti.js";
import { kallolini, kalloliniPads, kalloliniPage } from "./kallolini.js";

function defineCollection(collection) {
  return {
    ...collection,
    indexById: new Map(collection.pads.map((pad, index) => [pad.id, index])),
    padById: new Map(collection.pads.map((pad) => [pad.id, pad])),
  };
}

export const readerCollections = Object.freeze({
  jayanti: defineCollection({
    title: jayanti.title,
    pads: jayantiPads,
    page: jayantiPage,
    sections: [],
    firstId: jayantiPads[0].id,
    shortcuts: jayantiShortcuts,
  }),
  kallolini: defineCollection({
    title: kallolini.title,
    pads: kalloliniPads,
    page: kalloliniPage,
    sections: kallolini.sections,
    firstId: kalloliniPads[0].id,
  }),
});

export function collectionPad(mode, id) {
  return Object.hasOwn(readerCollections, mode)
    ? readerCollections[mode].padById.get(id) || null
    : null;
}

export function collectionBookmark(value) {
  if (typeof value !== "string") return null;
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const mode = value.slice(0, separator);
  if (!Object.hasOwn(readerCollections, mode)) return null;
  const idText = value.slice(separator + 1);
  if (!/^\d+$/.test(idText)) return null;
  const id = Number(idText);
  const pad = collectionPad(mode, id);
  return pad ? { mode, id, pad, title: readerCollections[mode].title } : null;
}
