const consonants = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "n",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "n",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  ळ: "l",
};
const vowels = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ii",
  उ: "u",
  ऊ: "uu",
  ऋ: "ri",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
};
const matras = {
  "ा": "aa",
  "ि": "i",
  "ी": "ii",
  "ु": "u",
  "ू": "uu",
  "ृ": "ri",
  "ॄ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ॅ": "e",
  "ॉ": "o",
};
export const devanagariNumber = (n) =>
  String(n).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[Number(d)]);
export function normalize(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)))
    .replace(/\u200c|\u200d|\u093c/g, "")
    .toLowerCase()
    .replace(/[।॥.,!?;:'"‘’“”()[\]{}—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function romanize(text = "") {
  let out = "";
  for (const c of String(text).normalize("NFD")) {
    if (consonants[c]) out += consonants[c] + "a";
    else if (vowels[c]) out += vowels[c];
    else if (matras[c]) out = out.replace(/a$/, "") + matras[c];
    else if (c === "्") out = out.replace(/a$/, "");
    else if (c === "ं" || c === "ँ") out += "n";
    else if (c === "ः") out += "h";
    else if (!/[\u093c\u200c\u200d]/.test(c)) out += c;
  }
  return normalize(out).replace(/a\b/g, "");
}
function phonetic(s) {
  return s
    .replace(/aa/g, "a")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/w/g, "v")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/[aeiou]/g, "")
    .replace(/(.)\1+/g, "$1");
}
export function makeSearchIndex(pads) {
  const byId = new Map(pads.map((p) => [p.id, p]));
  return pads.map((p) => {
    const notes = p.footnoteRefs?.length
      ? p.footnoteRefs
          .map((r) => byId.get(r.ownerPadId)?.footnotes?.[r.noteIndex])
          .filter(Boolean)
      : p.footnotes || [];
    const lines = [
      ...(p.headings || []),
      ...(p.verses || []),
      ...notes.flatMap((f) => f.lines || []),
    ];
    const title = p.title || lines[0] || "";
    const meta = [p.section, p.subtopic, p.raag, p.taal, p.form]
      .filter(Boolean)
      .join(" ");
    const whole = [title, meta, ...lines].join(" ");
    return {
      pad: p,
      title: normalize(title),
      body: normalize(whole),
      roman: romanize(whole),
      sound: phonetic(romanize(whole)),
      lines,
      meta: normalize(meta),
    };
  });
}
export function searchPads(
  index,
  query,
  { phrase = false, section = "" } = {},
) {
  const q = normalize(query);
  const pool = section ? index.filter((x) => x.pad.section === section) : index;
  if (!q)
    return pool.map((x) => ({
      pad: x.pad,
      snippet: x.lines[0] || "",
      score: 0,
    }));
  if (/^\d+$/.test(q))
    return pool
      .filter((x) => x.pad.id === Number(q))
      .map((x) => ({ pad: x.pad, snippet: x.lines[0] || "", score: 1000 }));
  const latin = /[a-z]/.test(q),
    terms = phrase ? [q] : q.split(" ");
  return pool
    .map((x) => {
      const exact = terms.every((t) => x.body.includes(t));
      const roman =
        latin && terms.every((t) => x.roman.includes(t.replace(/a\b/g, "")));
      const approximate =
        latin &&
        !phrase &&
        terms.every((t) => {
          const sound = phonetic(t);
          return sound.length >= 2 && x.sound.includes(sound);
        });
      if (!exact && !roman && !approximate) return null;
      const score =
        (exact ? 100 : roman ? 60 : 20) +
        (x.title.includes(q) ? 90 : 0) +
        (terms.every((t) => x.title.includes(t)) ? 40 : 0) +
        (x.body.includes(q) ? 20 : 0);
      const snippet =
        x.lines.find((l) => terms.some((t) => normalize(l).includes(t))) ||
        x.lines.find(
          (l) =>
            latin &&
            terms.some((t) => {
              const sound = phonetic(t);
              return sound.length >= 2 && phonetic(romanize(l)).includes(sound);
            }),
        ) ||
        x.lines[0] ||
        "";
      return { pad: x.pad, snippet, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.pad.id - b.pad.id);
}
