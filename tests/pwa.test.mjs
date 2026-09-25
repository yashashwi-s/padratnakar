/**
 * Tests that the PWA build artifacts exist and are correctly configured.
 * Runs against the dist/ directory — requires `npm run build` first.
 * The `npm run check` command always ends with `npm run build`, so on the
 * second and subsequent runs these tests see a fresh build output.
 * On the very first run (no dist/ yet) the dist-dependent tests are skipped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const root = new URL("../", import.meta.url).pathname;

// Skip all dist-dependent checks if there is no build yet.
const distExists = fs.existsSync(dist);
const skipIfNoDist = distExists ? {} : { skip: "dist/ not built yet" };

function distFile(rel) {
  return path.join(dist, rel);
}

// ─── Manifest ───────────────────────────────────────────────────────────────

test("manifest.webmanifest is emitted in dist", skipIfNoDist, () => {
  assert(
    fs.existsSync(distFile("manifest.webmanifest")),
    "dist/manifest.webmanifest missing",
  );
});

test(
  "manifest has correct start_url, scope, display, and name",
  skipIfNoDist,
  () => {
    const manifest = JSON.parse(
      fs.readFileSync(distFile("manifest.webmanifest"), "utf8"),
    );
    assert.equal(manifest.start_url, "/", "start_url must be /");
    assert.equal(manifest.scope, "/", "scope must be /");
    assert.equal(manifest.display, "standalone");
    assert(
      manifest.name.includes("पद रत्नाकर"),
      "name must contain Hindi title",
    );
  },
);

test("manifest icons include 192 and 512 entries", skipIfNoDist, () => {
  const manifest = JSON.parse(
    fs.readFileSync(distFile("manifest.webmanifest"), "utf8"),
  );
  const sizes = (manifest.icons || []).map((i) => i.sizes);
  assert(sizes.includes("192x192"), "missing 192x192 icon");
  assert(sizes.includes("512x512"), "missing 512x512 icon");
});

test(
  "manifest theme_color and background_color use the paper palette",
  skipIfNoDist,
  () => {
    const manifest = JSON.parse(
      fs.readFileSync(distFile("manifest.webmanifest"), "utf8"),
    );
    assert.equal(manifest.theme_color, "#f4efe4");
    assert.equal(manifest.background_color, "#f4efe4");
  },
);

// ─── Icons ──────────────────────────────────────────────────────────────────

test("icon-192.png exists in dist/icons/", skipIfNoDist, () => {
  assert(
    fs.existsSync(distFile("icons/icon-192.png")),
    "dist/icons/icon-192.png missing",
  );
});

test("icon-512.png exists in dist/icons/", skipIfNoDist, () => {
  assert(
    fs.existsSync(distFile("icons/icon-512.png")),
    "dist/icons/icon-512.png missing",
  );
});

test("apple-touch-icon.png exists in dist/icons/", skipIfNoDist, () => {
  assert(
    fs.existsSync(distFile("icons/apple-touch-icon.png")),
    "dist/icons/apple-touch-icon.png missing",
  );
});

test("icon files are valid PNG (PNG magic bytes)", skipIfNoDist, () => {
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  for (const name of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
    const buf = fs.readFileSync(distFile(`icons/${name}`));
    assert(
      buf.subarray(0, 4).equals(PNG_MAGIC),
      `${name} does not have PNG magic bytes`,
    );
  }
});

// This test is always runnable (not dist-dependent).
test("source brand image is not overwritten", () => {
  assert(
    fs.existsSync(path.join(root, "public/brand/pad-ratnakar.png")),
    "public/brand/pad-ratnakar.png must still exist",
  );
});

// ─── Service worker ─────────────────────────────────────────────────────────

test("sw.js is emitted in dist", skipIfNoDist, () => {
  assert(fs.existsSync(distFile("sw.js")), "dist/sw.js missing");
});

test("sw.js does not precache layout JSON corpus files", skipIfNoDist, () => {
  const sw = fs.readFileSync(distFile("sw.js"), "utf8");
  assert(
    !sw.includes("data/layout"),
    "sw.js must not precache layout corpus chunks",
  );
});

test("sw.js includes a navigateFallback for SPA routing", skipIfNoDist, () => {
  const sw = fs.readFileSync(distFile("sw.js"), "utf8");
  assert(
    sw.includes("navigateFallback") || sw.includes("index.html"),
    "sw.js must have a navigation fallback for SPA routes",
  );
});

// ─── index.html ─────────────────────────────────────────────────────────────

test("dist/index.html has manifest link tag", skipIfNoDist, () => {
  const html = fs.readFileSync(distFile("index.html"), "utf8");
  assert(html.includes('rel="manifest"'), "index.html missing manifest link");
});

test("dist/index.html has apple-touch-icon link", skipIfNoDist, () => {
  const html = fs.readFileSync(distFile("index.html"), "utf8");
  assert(
    html.includes("apple-touch-icon"),
    "index.html missing apple-touch-icon",
  );
});

// ─── vercel.json still correct (always runnable) ─────────────────────────────

test("vercel.json rewrites for SPA still present", () => {
  const vj = JSON.parse(
    fs.readFileSync(path.join(root, "vercel.json"), "utf8"),
  );
  const sources = (vj.rewrites || []).map((r) => r.source);
  assert(sources.includes("/pad/:id"), "vercel.json missing /pad/:id rewrite");
  assert(
    sources.includes("/shodash/:id"),
    "vercel.json missing /shodash/:id rewrite",
  );
});

// ─── No placeholder domain (always runnable) ────────────────────────────────

test("share-pad.js contains no padratnakar.example placeholder", () => {
  const src = fs.readFileSync(
    path.join(root, "src/lib/share-pad.js"),
    "utf8",
  );
  assert(!src.includes("padratnakar.example"), ".example domain must be gone");
});
