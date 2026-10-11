import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
test("Android download page has a stable APK link, release version and a deployed route", () => {
  const page = read("../public/android/index.html");
  const version = JSON.parse(read("../package.json")).version;
  const config = JSON.parse(read("../vercel.json"));
  assert.ok(page.includes(`Version ${version}`));
  assert.ok(page.includes('href="/downloads/pad-ratnakar-latest.apk"'));
  assert.ok(
    config.rewrites.some(
      (r) => r.source === "/android" && r.destination === "/android/index.html",
    ),
  );
  assert.ok(
    config.headers.some(
      (r) =>
        r.source === "/downloads/(.*)" &&
        r.headers.some(
          (h) =>
            h.key === "Cache-Control" && h.value.includes("must-revalidate"),
        ),
    ),
  );
});
