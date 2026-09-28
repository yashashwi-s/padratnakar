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
