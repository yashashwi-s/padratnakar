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
    .replace(/[\p{P}\p{S}]/gu, " ")
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
// Common keyboard spellings, not editorial changes to the source text.
function foldRoman(s) {
  return s
    .replace(/aa/g, "a")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/w/g, "v")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f");
}
function phonetic(s) {
  return foldRoman(s).replace(/[aeiou]/g, "");
}
function field(text, kind) {
  const normal = normalize(text);
  const roman = foldRoman(romanize(text));
  const words = roman.split(" ");
  const stems = words.map((w) => w.replace(/a$/, ""));
  const sourceWords = normal.split(" ");
  const searchStems = stems.flatMap((stem, i) =>
    sourceWords[i]?.startsWith("श्री") &&
    stem.startsWith("sri") &&
    stem.length > 3
      ? [stem, "sri", stem.slice(3)]
      : [stem],
  );
  return {
    text,
    kind,
    normal,
    roman,
    words,
    stems,
    searchStems,
    sounds: searchStems.map(phonetic),
  };
}
function combine(fields, kind) {
  return {
    kind,
    text: fields.map((f) => f.text).join(" "),
    normal: fields.map((f) => f.normal).join(" "),
    words: fields.flatMap((f) => f.words),
    stems: fields.flatMap((f) => f.stems),
    searchStems: fields.flatMap((f) => f.searchStems),
    sounds: fields.flatMap((f) => f.sounds),
  };
}
export function makeSearchIndex(pads) {
  const byId = new Map(pads.map((p) => [p.id, p]));
  return pads.map((p) => {
    const notes = p.footnoteRefs?.length
      ? p.footnoteRefs
          .map((r) => byId.get(r.ownerPadId)?.footnotes?.[r.noteIndex])
          .filter(Boolean)
      : p.footnotes || [];
    const fields = [
      field(p.title || "", "title"),
      ...[p.section, p.subtopic, p.raag, p.taal, p.form]
        .filter(Boolean)
        .map((s) => field(s, "metadata")),
      ...(p.headings || []).map((s) => field(s, "heading")),
      ...(p.verses || []).map((s) => field(s, "verse")),
      ...notes.flatMap((f) => f.lines || []).map((s) => field(s, "footnote")),
    ];
    // Phrase matching may cross printed line breaks, but not unrelated metadata.
    const body = fields.filter((f) => f.kind === "verse");
    const joined = combine(body, "body");
    return {
      pad: p,
      fields,
      joined,
      whole: combine(fields, "all"),
      lines: fields
        .filter((f) => ["heading", "verse", "footnote"].includes(f.kind))
        .map((f) => f.text),
    };
  });
}
function queryTerm(text) {
  const latin = /^[a-z]+$/.test(text);
  const roman = foldRoman(text).replace(/a$/, "");
  return { text, latin, roman, sound: phonetic(text) };
}
function matchTerm(f, term, approximate = true) {
  if (!term.latin) return f.normal.includes(term.text) ? 3 : 0;
  // Short Latin words must match whole words, never 'ram' inside 'param'.
  if (
    f.searchStems.some((stem) => {
      return (
        stem === term.roman ||
        (term.roman.length >= 4 && stem.startsWith(term.roman))
      );
    })
  )
    return 2;
  if (
    approximate &&
    term.text.length >= 4 &&
    term.sound.length >= 3 &&
    f.sounds.includes(term.sound)
  )
    return 1;
  return 0;
}
function phraseMatches(f, terms) {
  if (terms.every((t) => !t.latin))
    return f.normal.includes(terms.map((t) => t.text).join(" "));
  const words = f.normal.split(" ");
  // Mixed-script phrases compare each source word in place.
  return words.some((_, start) =>
    terms.every((term, offset) => {
      const word = words[start + offset];
      return (
        word !== undefined &&
        (term.latin
          ? f.stems[start + offset] === term.roman
          : word === term.text)
      );
    }),
  );
}
export function searchPads(
  index,
  query,
  { phrase = false, section = "" } = {},
) {
  const q = normalize(query);
  const pool = section ? index.filter((x) => x.pad.section === section) : index;
  if (!q)
    return String(query).trim()
      ? []
      : pool.map((x) => ({ pad: x.pad, snippet: x.lines[0] || "", score: 0 }));
  const number = /^(?:(?:pad|पद)(?: (?:number|संख्या))? )?(\d+)$/.exec(q);
  if (number)
    return pool
      .filter(
        (x) =>
          ("searchNumber" in x.pad ? x.pad.searchNumber : x.pad.id) ===
          Number(number[1]),
      )
      .map((x) => ({
        pad: x.pad,
        snippet: x.pad.title || x.lines[0] || "",
        score: 1000,
        matchKind: "number",
      }));
  phrase ||= /^["“].*["”]$/.test(String(query).trim());
  const terms = q.split(" ").map(queryTerm);
  const results = [];
  for (const x of pool) {
    if (!terms.every((t) => matchTerm(x.whole, t, !phrase))) continue;
    const strengths = terms.map(() => 0);
    let snippet = null;
    let snippetScore = -1;
    let titleMatches = false;
    for (const f of x.fields) {
      const values = terms.map((term) => matchTerm(f, term, !phrase));
      values.forEach((value, i) => {
        strengths[i] = Math.max(strengths[i], value);
      });
      const all = values.every(Boolean);
      if (f.kind === "title" && all) titleMatches = true;
      const localScore =
        values.filter(Boolean).length * 10 +
        values.reduce((a, b) => a + b, 0) +
        (f.kind === "verse" ? 1 : 0);
      if (values.some(Boolean) && localScore > snippetScore) {
        snippet = f;
        snippetScore = localScore;
      }
    }
    if (!strengths.every(Boolean)) continue;
    if (phrase && ![...x.fields, x.joined].some((f) => phraseMatches(f, terms)))
      continue;
    const quality = Math.min(...strengths);
    const phraseBonus = [x.fields[0], x.joined].some((f) =>
      phraseMatches(f, terms),
    )
      ? 20
      : 0;
    results.push({
      pad: x.pad,
      snippet: snippet?.text || x.lines[0] || "",
      snippetKind: snippet?.kind,
      matchKind: quality === 1 ? "approximate" : "exact",
      score: quality * 100 + (titleMatches ? 50 : 0) + phraseBonus,
    });
  }
  return results.sort((a, b) => b.score - a.score || a.pad.id - b.pad.id);
}

// Section names use the same keyboard spelling rules, without fuzzy matches.
const nameFields = new Map();
export function matchesSearchName(name, query) {
  const q = normalize(query);
  if (!q) return false;
  let f = nameFields.get(name);
  if (!f) {
    f = field(name, "name");
    nameFields.set(name, f);
  }
  return q.split(" ").every((t) => matchTerm(f, queryTerm(t), false));
}
