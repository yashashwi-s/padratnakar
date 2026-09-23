import hymns from "../data/hymns.json" with { type: "json" };
import shodash from "../../data/shodash-geet-layout.json" with { type: "json" };

const padsById = new Map(hymns.map((pad) => [pad.id, pad]));
const songsByNumber = new Map(
  shodash.items
    .filter((item) => item.role === "song")
    .map((item) => [item.number, item]),
);
const itemsByPadId = new Map(shodash.items.map((item) => [item.padId, item]));
const itemsByRole = new Map(
  shodash.items
    .filter((item) => item.role !== "song")
    .map((item) => [item.role, item]),
);

export function getPad(id) {
  const numeric = Number(id);
  return Number.isInteger(numeric) ? padsById.get(numeric) : undefined;
}

/** Resolve shared note references to their single canonical note records. */
export function getFootnotes(padOrId) {
  const pad =
    typeof padOrId === "object" && padOrId ? padOrId : getPad(padOrId);
  if (!pad) return [];
  const refs = pad.footnoteRefs || [];
  if (refs.length)
    return refs.flatMap((ref) => {
      const owner = getPad(ref.ownerPadId);
      const note = owner?.footnotes?.[ref.noteIndex];
      return note
        ? [
            {
              ...note,
              ownerPadId: ref.ownerPadId,
              noteIndex: ref.noteIndex,
              sharedWithPadIds: note.targetPadIds || [ref.ownerPadId],
            },
          ]
        : [];
    });
  return (pad.footnotes || []).map((note, noteIndex) => ({
    ...note,
    ownerPadId: pad.id,
    noteIndex,
    sharedWithPadIds: note.targetPadIds || [pad.id],
  }));
}

/**
 * Find a collection item without numeric ambiguity.
 * Use {number: 1..16}, {padId: 1..1565}, or the role "opening"/"closing".
 */
export function getShodashItem(selector) {
  if (typeof selector === "string") return itemsByRole.get(selector);
  if (!selector || typeof selector !== "object") return undefined;
  if (selector.number !== undefined)
    return songsByNumber.get(Number(selector.number));
  if (selector.padId !== undefined)
    return itemsByPadId.get(Number(selector.padId));
  return undefined;
}

export const shodashCollection = shodash;
export const padCount = hymns.length;
