// Original vector artwork from the 25 user-approved Vrindavan border studies.
// Geometry is trusted application code; no devotional text or external markup enters it.
const studies = [
  ["Gulab pankti", "Floral", "rose", "rose"],
  ["Mallika mala", "Floral", "jasmine", "sage"],
  ["Malti sitara", "Floral", "star", "pink"],
  ["Kamal rekha", "Floral", "lotus", "lotus"],
  ["Gulab guchchha", "Floral", "bouquet", "rose"],
  ["Malti lata", "Lata", "vine", "sage"],
  ["Mallika jali", "Lata", "doublevine", "sage"],
  ["Gulabi bel", "Lata", "rosevine", "pink"],
  ["Patra pallav", "Lata", "leaves", "olive"],
  ["Kunj ki khidki", "Lata", "arches", "ochre"],
  ["Mayur kunj", "Birds", "peacock", "peacock"],
  ["Shuk lata", "Birds", "parrot", "sage"],
  ["Pik pallav", "Birds", "koel", "ochre"],
  ["Sarika gulab", "Birds", "myna", "rose"],
  ["Mayur pankh", "Birds", "feather", "peacock"],
  ["Sanjhi pushp", "Sanjhi", "cutflower", "ochre"],
  ["Sanjhi patra", "Sanjhi", "cutleaf", "olive"],
  ["Kunj jali", "Sanjhi", "lattice", "pink"],
  ["Chandrika", "Sanjhi", "scallop", "moon"],
  ["Gorochan rekha", "Sanjhi", "paisley", "ochre"],
  ["Pushp toran", "Utsav", "garland", "pink"],
  ["Moti mallika", "Utsav", "pearls", "sage"],
  ["Jhulan bel", "Utsav", "bells", "olive"],
  ["Sharad pushpa", "Utsav", "moonlotus", "moon"],
  ["Phagun angan", "Utsav", "festival", "lotus"],
];
const palettes = {
  rose: ["#f4e3e6", "#ad7083", "#deb0bd", "#718268", "#c1a275"],
  sage: ["#eef0e3", "#718569", "#fdfbf0", "#819373", "#bea46b"],
  pink: ["#f7eae5", "#b47c83", "#edc2c1", "#8a9775", "#b79a65"],
  lotus: ["#f6ebda", "#b58372", "#e5b3b3", "#7f8c70", "#b89958"],
  olive: ["#eeeede", "#858563", "#e0dfbd", "#839071", "#b7a06b"],
  ochre: ["#f4ebd5", "#af8d4f", "#e9d49c", "#8c916e", "#ac8546"],
  peacock: ["#e7eeea", "#618481", "#a2c1b5", "#6c8c79", "#b59c65"],
  moon: ["#edf0ed", "#8b9da1", "#fdfbf3", "#91a393", "#b6aa89"],
};
const path = (d, fill, stroke, sw = 0.7) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x, y, r, f, s = "none", sw = 0.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${s}" stroke-width="${sw}"/>`;
const g = (x, y, content, rot = 0, scale = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">${content}</g>`;
function flower(type, p) {
  const [bg, ink, petal, , gold] = p;
  let s = "";
  const n = type === "star" ? 5 : type === "jasmine" ? 6 : 8;
  for (let i = 0; i < n; i++)
    s += g(
      0,
      0,
      path(
        type === "rose"
          ? "M0-1 C-4-2-5-7-2-8 Q0-11 2-8 C5-7 4-2 0-1Z"
          : type === "star"
            ? "M0-1 Q-5-4-2-9 Q1-7 3-6 Q5-3 0-1Z"
            : "M0-1 C-4-3-3-8 0-9 C3-8 4-3 0-1Z",
        petal,
        ink,
        0.55,
      ),
      (i * 360) / n,
    );
  if (type === "rose")
    for (let i = 0; i < 6; i++)
      s += g(
        0,
        0,
        path("M0-1 Q-4-4 0-5 Q4-4 0-1Z", bg, ink, 0.45),
        i * 60 + 20,
      );
  return (
    s + circle(0, 0, 1.65, gold, ink, 0.4) + circle(-0.4, -0.5, 0.5, "#fffaf1")
  );
}
function leaves(p) {
  return (
    path("M0 9 Q1 0 0-9", "none", p[3]) +
    path("M0 3 Q-10 2-8-5 Q-1-5 0 3Z", p[3], p[1], 0.4) +
    path("M0-1 Q10-2 8-9 Q1-9 0-1Z", p[2], p[3], 0.5) +
    path("M-7-4L0 3M7-8L0-1", "none", p[0], 0.5)
  );
}
function lotus(p) {
  return (
    path("M0 8 Q-11 5-10-4 Q-4-4 0 2 Q4-4 10-4 Q11 5 0 8Z", p[2], p[1]) +
    path("M0 7 Q-7-2 0-11 Q7-2 0 7Z", p[0], p[1]) +
    path("M-11 8Q0 12 11 8M-6 7Q0 10 6 7", "none", p[4])
  );
}
function bird(type, p) {
  const body =
    type === "parrot"
      ? "#87986e"
      : type === "koel"
        ? "#6d6c67"
        : type === "myna"
          ? "#9a8872"
          : "#6e9997";
  let s = "";
  if (type === "peacock") {
    for (let i = 0; i < 5; i++) {
      s += g(
        -3,
        4,
        path("M0 0Q-12-4-13-15Q-5-13 0 0Z", "#b1c4ae", p[3], 0.5) +
          circle(-10, -11, 2.4, p[4]) +
          circle(-10, -11, 1.3, p[1]),
        i * 13 - 18,
        0.72,
      );
    }
  }
  s += path(
    "M-2 3Q-9 5-11 12L-7 12Q-3 9 2 7Q9 7 9 1L8-5Q6-10 3-7Q1-5 4-1Q1 0-2 3Z",
    body,
    p[1],
    0.55,
  );
  s +=
    path("M-3 4Q2 0 5 3Q4 7-3 4Z", p[2], p[1], 0.45) +
    path("M8-6L12-4L8-3Z", type === "parrot" ? "#b48077" : p[4], p[1], 0.4) +
    circle(6, -5, 0.65, "#403f35") +
    path("M3 7L2 11M5 7L5 11", "none", p[4]);
  if (type === "peacock")
    s += path("M4-8L2-12M5-8L5-13M6-8L8-12", "none", p[1], 0.5);
  return s;
}
function motif(kind, p) {
  switch (kind) {
    case "rose":
    case "jasmine":
    case "star":
      return flower(kind, p);
    case "lotus":
    case "moonlotus":
      return lotus(p);
    case "bouquet":
      return (
        g(-4, -3, flower("rose", p), 0, 0.6) +
        g(4, 2, flower("rose", p), 0, 0.65) +
        g(0, 6, leaves(p), 0, 0.55)
      );
    case "feather":
      return (
        path("M0 12Q1 4 0-9", "none", p[4]) +
        path("M0 7C-12 0-9-12 0-13C9-12 12 0 0 7Z", p[3], p[1]) +
        path("M0 3C-7-2-5-9 0-9C5-9 7-2 0 3Z", p[4], p[0], 0.5) +
        circle(0, -4, 2.5, p[1]) +
        circle(-0.6, -4.5, 0.8, p[0])
      );
    case "cutflower":
      return flower("star", [p[0], p[1], p[1], p[3], p[0]]);
    case "cutleaf":
      return leaves([p[0], p[1], p[0], p[1], p[4]]);
    case "lattice":
      return (
        path("M0-11L11 0L0 11L-11 0Z", "none", p[1], 0.6) +
        g(0, 0, flower("jasmine", p), 0, 0.55)
      );
    case "paisley":
      return (
        path("M-3 9C-14 1-3-8 5-10C1-4 10-1 7 5Q4 12-3 9Z", p[2], p[1]) +
        path("M-2 6Q-8 1 1-4Q6 3-2 6Z", p[0], p[1], 0.5) +
        circle(-1, 2, 1, p[4])
      );
    case "bells":
      return (
        path("M0-11Q-3-7 0-4", "none", p[3]) +
        path("M0-6Q-7-3-5 3L-8 5Q0 10 8 5L5 3Q7-3 0-6Z", p[2], p[1]) +
        circle(0, 8, 1.3, p[4]) +
        g(-5, -5, leaves(p), -40, 0.5)
      );
    default:
      return flower("jasmine", p);
  }
}
function strip(kind, p, length, symbols) {
  const { flower, leaves, bird, motif } = symbols;
  let out = "";
  const count = Math.max(2, Math.round(length / 25)),
    step = length / count;
  const vines = [
    "vine",
    "doublevine",
    "leaves",
    "arches",
    "parrot",
    "koel",
    "myna",
  ];
  if (vines.includes(kind)) {
    let d = "M0 0";
    for (let i = 0; i < count; i++)
      d += ` Q${(i + 0.5) * step} ${i % 2 ? -7 : 7} ${(i + 1) * step} 0`;
    out += path(d, "none", p[3], 0.8);
    if (kind === "doublevine")
      out += `<g transform="scale(1 -1)">${path(d, "none", p[4], 0.55)}</g>`;
  }
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * step;
    if (vines.includes(kind)) {
      out += g(x, 0, leaves(p), i % 2 ? 70 : -70, 0.65);
      if (["parrot", "koel", "myna"].includes(kind))
        out += g(
          x,
          i % 2 ? 2 : -2,
          i % 3 === 1 ? bird(kind, p) : flower("star", p),
          i % 3 === 1 ? 0 : 35,
          i % 3 === 1 ? 0.85 : 0.45,
        );
      else if (kind !== "leaves")
        out += g(
          x,
          i % 2 ? 5 : -5,
          flower(
            kind === "rosevine" ? "rose" : kind === "vine" ? "star" : "jasmine",
            p,
          ),
          0,
          0.5,
        );
      if (kind === "arches")
        out += g(
          x,
          0,
          path(
            `M${-step / 2} 8Q${-step / 2} -10 0-10Q${step / 2} -10 ${step / 2} 8`,
            "none",
            p[4],
            0.55,
          ),
        );
    } else if (kind === "garland" || kind === "pearls") {
      out += g(
        x,
        0,
        path(`M${-step / 2} -6Q0 12 ${step / 2} -6`, "none", p[4], 0.65),
      );
      for (let j = 0; j < 7; j++) {
        const t = j / 6;
        out += circle(
          x - step / 2 + t * step,
          -6 + 18 * t * (1 - t),
          kind === "pearls" ? 1.45 : 1.1,
          p[2],
          p[1],
          0.35,
        );
      }
      out += g(x - step / 2, -6, flower("jasmine", p), 0, 0.45);
    } else if (kind === "scallop")
      out += g(
        x,
        0,
        path(`M${-step / 2} -8Q0 15 ${step / 2} -8`, "none", p[1]) +
          g(0, -1, flower("star", p), 0, 0.6),
      );
    else if (kind === "festival")
      out +=
        g(x, 0, i % 2 ? lotus(p) : flower("rose", p), 0, 0.78) +
        g(x + step / 2, 0, leaves(p), 90, 0.35);
    else if (kind === "peacock")
      out +=
        g(x, 0, flower("jasmine", p), 0, 0.6) +
        circle(x + step / 2, 0, 1, p[4]);
    else {
      out += g(x, 0, motif(kind, p), 0, kind === "moonlotus" ? 0.72 : 0.85);
      if (kind === "moonlotus") out += circle(x + step / 2, 0, 2.5, p[0], p[4]);
    }
  }
  return out;
}

export const readerBorders = Object.freeze(
  studies.map(([name, family, kind, palette]) =>
    Object.freeze({ name, family, kind, palette }),
  ),
);
// Interleave families, with every design appearing once in each block of 25 pads.
const sequence = [
  0, 5, 11, 15, 20, 1, 6, 12, 16, 21, 2, 7, 13, 17, 22, 3, 8, 14, 18, 23, 4, 9,
  10, 19, 24,
];
export function readerBorderIndex(collection, position) {
  let offset = 0;
  for (const char of collection)
    offset = (offset * 31 + char.charCodeAt(0)) % sequence.length;
  return sequence[
    (((position + offset) % sequence.length) + sequence.length) %
      sequence.length
  ];
}

// One decoded image resource per design, reused by every page and image export.
// Six motifs cover both the alternating and three-part bird/vine rhythms.
const tiles = new Map();
function borderTiles(index) {
  if (tiles.has(index)) return tiles.get(index);
  const { kind, palette } = readerBorders[index];
  const p = palettes[palette];
  const image = (width, body) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26">${body}</svg>`)}`;
  const symbols = {
    flower: (type) => flower(type, p),
    leaves: () => leaves(p),
    bird: (type) => bird(type, p),
    motif: (type) => motif(type, p),
  };
  const corner =
    kind === "peacock"
      ? bird("peacock", p)
      : kind === "feather"
        ? motif("feather", p)
        : flower(
            kind === "rose" || kind === "rosevine" ? "rose" : "jasmine",
            p,
          );
  const result = {
    edge: image(150, g(0, 13, strip(kind, p, 150, symbols))),
    corner: image(26, g(13, 13, corner, 0, 0.9)),
  };
  tiles.set(index, result);
  return result;
}

/** Constant DOM size, even for book-length pads; all resources are embedded. */
export function readerBorderMarkup(index, width, height, prefix) {
  const p = palettes[readerBorders[index].palette];
  const tile = borderTiles(index);
  const shape = `M0 0H${width}V${height}H0Z M26 26V${height - 26}H${width - 26}V26Z`;
  const edge = (length) =>
    `<rect width="${length}" height="26" fill="url(#${prefix}-tile)"/>`;
  const art =
    g(26, 0, edge(width - 52)) +
    g(width - 26, height, edge(width - 52), 180) +
    g(0, height - 26, edge(height - 52), -90) +
    g(width, 26, edge(height - 52), 90);
  const corners = [
    [0, 0, 0],
    [width, 0, 90],
    [width, height, 180],
    [0, height, 270],
  ]
    .map(([x, y, rotation]) =>
      g(
        x,
        y,
        `<image width="26" height="26" href="${tile.corner}"/>`,
        rotation,
      ),
    )
    .join("");
  return `<defs><pattern id="${prefix}-tile" patternUnits="userSpaceOnUse" width="150" height="26"><image width="150" height="26" href="${tile.edge}"/></pattern><clipPath id="${prefix}-band"><path d="${shape}" clip-rule="evenodd"/></clipPath></defs><path d="${shape}" fill="${p[0]}" fill-rule="evenodd"/><g clip-path="url(#${prefix}-band)">${art}${corners}</g><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${p[1]}" stroke-width=".65"/><rect x="25" y="25" width="${width - 50}" height="${height - 50}" fill="none" stroke="${p[1]}" stroke-width=".6"/><rect x="29" y="29" width="${width - 58}" height="${height - 58}" fill="none" stroke="${p[4]}" stroke-width=".45"/>`;
}
