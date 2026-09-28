import hymns from "../data/hymns.json" with { type: "json" };
import { shodashCollection } from "./corpus.js";
import { collectionPad, readerCollections } from "./reader-collections.js";

const canonicalPadIds = new Set(hymns.map((pad) => pad.id));

export function routePath(mode, id) {
  return `/${mode}/${id}`;
}

export function validRoute(value) {
  const path = (value || "").replace(/^#/, "");
  const match = /^\/([^/]+)\/(\d+)\/?$/.exec(path);
  if (!match) return null;

  const mode = match[1];
  const id = Number(match[2]);
  if (mode === "pad" && canonicalPadIds.has(id)) return { mode, id };
  if (mode === "shodash" && id < shodashCollection.items.length)
    return { mode, id };
  if (Object.hasOwn(readerCollections, mode) && collectionPad(mode, id))
    return { mode, id };
  return null;
}
