import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pkg from "../package.json" with { type: "json" };
import config from "../capacitor.config.json" with { type: "json" };

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Android and both iOS configurations share the release identity and version", () => {
  const android = read("../android/app/build.gradle");
  const ios = read("../ios/App/App.xcodeproj/project.pbxproj");
  assert.equal(android.match(/versionName "([^"]+)"/)[1], pkg.version);
  assert.equal(android.match(/applicationId "([^"]+)"/)[1], config.appId);
  const code = android.match(/versionCode (\d+)/)[1];
  const versions = [...ios.matchAll(/MARKETING_VERSION = ([^;]+);/g)];
  const builds = [...ios.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
  const ids = [...ios.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)];
  assert.equal(versions.length, 2);
  assert.equal(builds.length, 2);
  assert.equal(ids.length, 2);
  for (const match of versions) assert.equal(match[1], pkg.version);
  for (const match of builds) assert.equal(match[1], code);
  for (const match of ids) assert.equal(match[1], config.appId);
});
