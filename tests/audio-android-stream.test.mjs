import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test(
  "Android streams, validates, times out, falls back and cancels without leaving partial files",
  {
    skip:
      spawnSync("javac", ["-version"]).status !== 0 ? "Requires a JDK" : false,
  },
  () => {
    const output = mkdtempSync(join(tmpdir(), "pad-audio-test-"));
    try {
      execFileSync(
        "javac",
        [
          "-d",
          output,
          fileURLToPath(
            new URL(
              "../android/app/src/main/java/org/padratnakar/reader/RecordingDownload.java",
              import.meta.url,
            ),
          ),
          fileURLToPath(
            new URL("./android/RecordingDownloadTest.java", import.meta.url),
          ),
        ],
        { timeout: 15000 },
      );
      const result = execFileSync(
        "java",
        ["-cp", output, "org.padratnakar.reader.RecordingDownloadTest", output],
        { encoding: "utf8", timeout: 15000 },
      );
      assert.match(result, /cancellation and cleanup passed/);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  },
);
