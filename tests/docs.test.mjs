import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("README stays below the project limit of 200 lines", () => {
  const text = fs.readFileSync(
    new URL("../README.md", import.meta.url),
    "utf8",
  );
  const lines = text.trimEnd().split(/\r?\n/).length;
  assert(lines < 200, `README has ${lines} lines; move details into docs/`);
});
