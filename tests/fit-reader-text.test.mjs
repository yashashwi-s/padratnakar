import { test } from "node:test";
import assert from "node:assert/strict";
import { fitReaderText } from "../src/lib/fit-reader-text.js";
test("body fitting uses one size across lines and fragments, batches reads and caches remounts", () => {
  const calls = [];
  const line = () => ({
    className: { baseVal: "print-verse" },
    dataset: { textWidth: "302" },
  });
  const make = (parent, text, x, width, natural) => ({
    parentElement: parent,
    innerHTML: text,
    textContent: text,
    dataset: {
      fitX: String(x),
      fitSize: "15",
      fitWidth: String(width),
      fitCentered: "false",
    },
    attrs: {},
    removeAttribute(k) {
      calls.push("write");
      delete this.attrs[k];
    },
    setAttribute(k, v) {
      calls.push("write");
      this.attrs[k] = v;
    },
    getComputedTextLength() {
      calls.push("read");
      return natural;
    },
  });
  const first = line(),
    second = line();
  const a = make(first, "long body line", 0, 300, 330),
    b = make(second, "normal words ", 0, 260, 180),
    c = make(second, "last word", 270, 30, 60);
  fitReaderText([a, b, c]);
  assert.deepEqual(
    calls.slice(calls.indexOf("read"), calls.lastIndexOf("read") + 1),
    ["read", "read", "read"],
  );
  assert.equal(a.attrs["font-size"], b.attrs["font-size"]);
  assert.equal(b.attrs["font-size"], c.attrs["font-size"]);
  assert(
    Number(c.attrs.x) + (60 * Number(c.attrs["font-size"])) / 15 <= 300.001,
  );
  calls.length = 0;
  fitReaderText([a, b, c]);
  assert(!calls.includes("read"));
});

test("source-constrained lines retain their extents without independently shrinking words", () => {
  const group = {
    className: { baseVal: "print-verse" },
    dataset: { textWidth: "480", sourceFit: "true" },
  };
  const e = {
    parentElement: group,
    innerHTML: "source constrained test",
    textContent: "source constrained test",
    dataset: { fitX: "100", fitSize: "20", fitWidth: "200" },
    attrs: {},
    removeAttribute(k) {
      delete this.attrs[k];
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getComputedTextLength() {
      return 250;
    },
  };
  fitReaderText([e]);
  assert.equal(Number(e.attrs["font-size"]), 16);
  assert.equal(Number(e.attrs.x), 100);
});

test("straight illustrated columns do not stretch spaces to fill short lines", () => {
  const element = {
    parentElement: {
      className: { baseVal: "print-verse" },
      dataset: { textWidth: "200", sourceFit: "true", justify: "false" },
    },
    innerHTML: "straight column natural spacing",
    textContent: "straight column natural spacing",
    dataset: { fitX: "8", fitSize: "16", fitWidth: "190" },
    attrs: {},
    removeAttribute(key) {
      delete this.attrs[key];
    },
    setAttribute(key, value) {
      this.attrs[key] = value;
    },
    getComputedTextLength() {
      return 120;
    },
  };
  fitReaderText([element]);
  assert.equal(element.attrs["font-size"], "16");
  assert.equal(element.attrs.x, "8");
  assert.equal(element.attrs["word-spacing"], undefined);
});
