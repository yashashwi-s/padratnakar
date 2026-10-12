import { test } from "node:test";
import assert from "node:assert/strict";
import { routePath, validRoute } from "../src/lib/collection-routes.js";
import { shareLink, SITE_ORIGIN } from "../src/lib/share-pad.js";

test("actual routes round-trip clean and legacy links across every collection", () => {
  for (const [mode, ids] of Object.entries({
    pad: [1, 1565],
    shodash: [0, 17],
    jayanti: [1, 18],
    kallolini: [1, 117],
  })) {
    for (const id of ids) {
      const path = routePath(mode, id);
      assert.deepEqual(validRoute(path), { mode, id });
      assert.deepEqual(validRoute(`#${path}`), { mode, id });
      assert.deepEqual(validRoute(`${path}/`), { mode, id });
      assert.equal(shareLink(mode, id), `${SITE_ORIGIN}${path}`);
      assert(!shareLink(mode, id).includes("#"));
    }
  }
});
test("actual route validation rejects malformed and out-of-range input", () => {
  for (const path of [
    "",
    "/",
    "/pad/0",
    "/pad/1566",
    "/shodash/18",
    "/jayanti/19",
    "/kallolini/118",
    "/unknown/1",
    "/pad/-1",
    "/pad/1.5",
    "/pad/abc",
    "/pad/1/extra",
    "/constructor/1",
    "/__proto__/1",
  ]) {
    assert.equal(validRoute(path), null, path);
  }
});

test("collection names are canonical while old shared links retain their destinations", () => {
  for (const [mode, id, path] of [
    ["pad", 48, "/pad-ratnakar/48"],
    ["shodash", 5, "/shodash-geet/5"],
    ["jayanti", 1, "/bhaiji-jayanti/1"],
    ["kallolini", 8, "/mahabhav-kallolini/8"],
    ["rkk", 1, "/radhakripakataksh"],
    ["madhupark", 55, "/madhupark/55"],
  ]) {
    assert.equal(routePath(mode, id), path);
    assert.deepEqual(validRoute(path), { mode, id });
    assert.deepEqual(validRoute(`/${mode}/${id}`), { mode, id });
    assert.deepEqual(validRoute(`#${path}`), { mode, id });
    assert.equal(shareLink(mode, id), `${SITE_ORIGIN}${path}`);
  }
  assert.equal(validRoute("/radhakripakataksh/2"), null);
});
