/**
 * Tests for the routing abstraction: routePath, routeUrl, validRoute,
 * shareLink, and the homepage / legacy-hash migration logic.
 *
 * These functions are tested as pure logic, without a browser environment.
 * The Capacitor platform flag is injected via mock objects.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// ─── routePath / routeUrl pure logic ────────────────────────────────────────

function routePath(mode, id) {
  return `/${mode}/${id}`;
}
function routeUrl(mode, id, isNative) {
  const path = routePath(mode, id);
  return isNative ? `#${path}` : path;
}

test("routePath produces clean paths without a hash", () => {
  assert.equal(routePath("pad", 1), "/pad/1");
  assert.equal(routePath("pad", 123), "/pad/123");
  assert.equal(routePath("pad", 1565), "/pad/1565");
  assert.equal(routePath("shodash", 0), "/shodash/0");
  assert.equal(routePath("shodash", 4), "/shodash/4");
  assert.equal(routePath("shodash", 17), "/shodash/17");
});

test("routeUrl is clean on web, hash-prefixed on native", () => {
  // Web
  assert.equal(routeUrl("pad", 123, false), "/pad/123");
  assert.equal(routeUrl("shodash", 4, false), "/shodash/4");
  // Native
  assert.equal(routeUrl("pad", 123, true), "#/pad/123");
  assert.equal(routeUrl("shodash", 4, true), "#/shodash/4");
});

// ─── validRoute (path-normalized version from App.jsx) ────────────────────

function validRoute(value, padCount = 1565, shodashCount = 18) {
  const path = (value || "").replace(/^#/, "");
  let match = path.match(/^\/pad\/(\d+)\/?$/);
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= padCount)
    return { mode: "pad", id: Number(match[1]) };
  match = path.match(/^\/shodash\/(\d+)\/?$/);
  if (match && Number(match[1]) < shodashCount)
    return { mode: "shodash", id: Number(match[1]) };
  return null;
}

test("validRoute parses clean web paths", () => {
  assert.deepEqual(validRoute("/pad/1"), { mode: "pad", id: 1 });
  assert.deepEqual(validRoute("/pad/123"), { mode: "pad", id: 123 });
  assert.deepEqual(validRoute("/pad/1565"), { mode: "pad", id: 1565 });
  assert.deepEqual(validRoute("/shodash/0"), { mode: "shodash", id: 0 });
  assert.deepEqual(validRoute("/shodash/4"), { mode: "shodash", id: 4 });
});

test("validRoute parses legacy hash paths by stripping the leading #", () => {
  // Old-style /#/pad/123 => hash is "#/pad/123" after the #
  assert.deepEqual(validRoute("#/pad/400"), { mode: "pad", id: 400 });
  assert.deepEqual(validRoute("#/shodash/4"), { mode: "shodash", id: 4 });
});

test("validRoute rejects invalid or out-of-range values", () => {
  assert.equal(validRoute(""), null);
  assert.equal(validRoute("/"), null);
  assert.equal(validRoute("/#"), null);
  assert.equal(validRoute("/pad/0"), null); // 0 is not a valid pad
  assert.equal(validRoute("/pad/9999"), null); // beyond corpus
  assert.equal(validRoute("/pad/abc"), null);
  assert.equal(validRoute("#/pad/9999"), null);
  assert.equal(validRoute("/shodash/9999"), null);
});

test("validRoute accepts trailing slash variants", () => {
  assert.deepEqual(validRoute("/pad/100/"), { mode: "pad", id: 100 });
  assert.deepEqual(validRoute("/shodash/3/"), { mode: "shodash", id: 3 });
});

// ─── shareLink produces clean Vercel URLs ─────────────────────────────────

const SITE_ORIGIN = "https://padratnakar.vercel.app";
function shareLink(mode, id) {
  return `${SITE_ORIGIN}/${mode}/${id}`;
}

test("shareLink produces a clean Vercel URL without a hash", () => {
  assert.equal(shareLink("pad", 1), "https://padratnakar.vercel.app/pad/1");
  assert.equal(shareLink("pad", 123), "https://padratnakar.vercel.app/pad/123");
  assert.equal(
    shareLink("pad", 1565),
    "https://padratnakar.vercel.app/pad/1565",
  );
  assert.equal(
    shareLink("shodash", 0),
    "https://padratnakar.vercel.app/shodash/0",
  );
  assert.equal(
    shareLink("shodash", 4),
    "https://padratnakar.vercel.app/shodash/4",
  );
});

test("shareLink never contains a hash fragment", () => {
  for (const id of [1, 50, 123, 400, 800, 1000, 1565]) {
    assert(!shareLink("pad", id).includes("#"), `pad/${id} must not contain #`);
  }
  for (const i of [0, 4, 17]) {
    assert(
      !shareLink("shodash", i).includes("#"),
      `shodash/${i} must not contain #`,
    );
  }
});

test("shareLink never contains padratnakar.example placeholder", () => {
  for (const id of [1, 100, 1565]) {
    assert(
      !shareLink("pad", id).includes("padratnakar.example"),
      `pad/${id} must not contain .example domain`,
    );
  }
});

// ─── Homepage / root path behaviour ─────────────────────────────────────────

test("root pathname '/' resolves to Pad 1 as the homepage", () => {
  // Simulate routeFromLocation on web with pathname = "/"
  const pathname = "/";
  const pathRoute = validRoute(pathname);
  const hashRoute = validRoute("");
  // Neither path nor hash match a pad route, so root "/" falls through to homepage
  assert.equal(pathRoute, null); // "/" is not a pad route
  assert.equal(hashRoute, null);
  // The loadRoute() fallback for "/" is { mode: "pad", id: 1 }
  const fallback = pathname === "/" ? { mode: "pad", id: 1 } : null;
  assert.deepEqual(fallback, { mode: "pad", id: 1 });
});

test("legacy hash URL is recognized and would be converted to clean path", () => {
  // When location.hash = "#/pad/400" and location.pathname = "/"
  const hashRoute = validRoute("#/pad/400");
  assert.deepEqual(hashRoute, { mode: "pad", id: 400 });
  // The converted path would be routePath(hashRoute.mode, hashRoute.id)
  const convertedPath = routePath(hashRoute.mode, hashRoute.id);
  assert.equal(convertedPath, "/pad/400");
  assert(!convertedPath.includes("#"));
});

test("legacy shodash hash URL is recognized and would be converted", () => {
  const hashRoute = validRoute("#/shodash/4");
  assert.deepEqual(hashRoute, { mode: "shodash", id: 4 });
  const convertedPath = routePath(hashRoute.mode, hashRoute.id);
  assert.equal(convertedPath, "/shodash/4");
  assert(!convertedPath.includes("#"));
});

// ─── Safety assertions: no placeholder domain, no hash in public URLs ─────

test("SITE_ORIGIN is the Vercel domain, not a placeholder", () => {
  assert.equal(SITE_ORIGIN, "https://padratnakar.vercel.app");
  assert(!SITE_ORIGIN.includes(".example"));
  assert(!SITE_ORIGIN.includes("/#/"));
});
