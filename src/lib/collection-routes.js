import hymns from "../data/hymns.json" with { type: "json" };
import { shodashCollection } from "./corpus.js";
import { collectionPad, readerCollections } from "./reader-collections.js";

const canonicalPadIds = new Set(hymns.map((pad) => pad.id));

export const collectionSlugs = Object.freeze({
  pad: "pad-ratnakar",
  shodash: "shodash-geet",
  jayanti: "bhaiji-jayanti",
  kallolini: "mahabhav-kallolini",
  rkk: "radhakripakataksh",
  madhupark: "madhupark",
});
const modesBySlug = new Map(
  Object.entries(collectionSlugs).map(([mode, slug]) => [slug, mode]),
);
export function routePath(mode, id) {
  const slug = collectionSlugs[mode] || mode;
  return mode === "rkk" ? `/${slug}` : `/${slug}/${id}`;
}

export function validRoute(value) {
  const path = (value || "").replace(/^#/, "");
  if (/^\/radhakripakataksh\/?$/.test(path)) return { mode: "rkk", id: 1 };
  const match = /^\/([^/]+)\/(\d+)\/?$/.exec(path);
  if (!match) return null;

  const mode = modesBySlug.get(match[1]) || match[1];
  const id = Number(match[2]);
  if (mode === "pad" && canonicalPadIds.has(id)) return { mode, id };
  if (mode === "shodash" && id < shodashCollection.items.length)
    return { mode, id };
  if (Object.hasOwn(readerCollections, mode) && collectionPad(mode, id))
    return { mode, id };
  return null;
}
