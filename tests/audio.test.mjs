import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import tracks from "../src/data/shodash-audio.json" with { type: "json" };
import { createAudioController } from "../src/lib/audio/controller.js";
import { collectionBookmark } from "../src/lib/reader-collections.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));
class Media extends EventTarget {
  currentTime = 0;
  duration = 60;
  ended = false;
  paused = true;
  src = "";
  play() {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  load() {
    this.currentTime = 0;
    this.ended = false;
  }
  removeAttribute() {
    this.src = "";
  }
}
function setup(source = async (track) => ({ url: `track:${track.id}` })) {
  const audio = new Media(),
    advanced = [];
  const player = createAudioController({
    audio,
    source,
    onAdvance: (id) => advanced.push(id),
  });
  return { audio, advanced, player };
}
test("all 18 original recordings are intact and corrected in sequence", () => {
  assert.deepEqual(
    tracks.map((t) => t.id),
    Array.from({ length: 18 }, (_, i) => i),
  );
  assert.match(tracks[0].originalFile, /^00 /);
  assert.match(tracks[16].originalFile, /^17 /);
  assert.match(tracks[17].originalFile, /^18 /);
  for (const track of tracks) {
    const file = readFileSync(
      new URL(`../public${track.file}`, import.meta.url),
    );
    assert.equal(file.length, track.bytes);
    assert.equal(createHash("sha256").update(file).digest("hex"), track.sha256);
    assert(track.duration > 0);
  }
});
test("Shodash bookmark IDs include invocation, song 16 and Pushpika independently", () => {
  for (const id of [0, 1, 16, 17]) {
    const saved = collectionBookmark(`shodash:${id}`);
    assert.equal(saved.mode, "shodash");
    assert.equal(saved.id, id);
  }
  for (const value of ["shodash:18", "shodash:-1", "shodash:foo", 1])
    assert.equal(collectionBookmark(value), null);
});
test("playing follows navigation, paused navigation stays paused, unavailable collection stops", async () => {
  const { player, audio } = setup();
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  await tick();
  assert.equal(audio.paused, false);
  player.setTrack(tracks[1]);
  await tick();
  assert.equal(audio.src, "track:1");
  assert.equal(audio.paused, false);
  player.toggle();
  player.setTrack(tracks[2]);
  await tick();
  assert.equal(audio.paused, true);
  player.toggle();
  await tick();
  player.setTrack(null);
  assert.equal(audio.paused, true);
  assert.equal(player.getSnapshot().intent, false);
  player.dispose();
});
test("automatic advancement reaches Pushpika and stops without wrapping", async () => {
  const { player, audio, advanced } = setup();
  player.setTrack(tracks[16]);
  await tick();
  player.toggle();
  await tick();
  audio.dispatchEvent(new Event("ended"));
  assert.deepEqual(advanced, [17]);
  player.setTrack(tracks[17]);
  await tick();
  audio.dispatchEvent(new Event("ended"));
  assert.deepEqual(advanced, [17]);
  assert.equal(player.getSnapshot().intent, false);
  player.dispose();
});
test("stale downloads cannot replace a newer page or resume playback", async () => {
  let resolveOld;
  let released = false;
  const { player, audio } = setup((track) =>
    track.id === 0
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve({ url: "new" }),
  );
  player.setTrack(tracks[0]);
  player.toggle();
  player.setTrack(tracks[1]);
  await tick();
  resolveOld({
    url: "old",
    release: () => {
      released = true;
    },
  });
  await tick();
  assert.equal(audio.src, "new");
  assert.equal(released, true);
  player.dispose();
});
test("play obtains an uncached recording and seeking stays within its duration", async () => {
  const requested = [];
  const { player, audio } = setup(async (track, { download }) => {
    requested.push(download);
    return download ? { url: "downloaded" } : null;
  });
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  await tick();
  assert.equal(audio.paused, false);
  assert.deepEqual(requested, [false, true]);
  player.seek(999);
  assert.equal(audio.currentTime, tracks[0].duration);
  player.dispose();
});
test("failed download and blocked autoplay are retryable", async () => {
  let fail = true;
  const { player, audio } = setup(async () => {
    if (fail) throw new Error("offline");
    return { url: "ok" };
  });
  player.setTrack(tracks[0]);
  await tick();
  assert(player.getSnapshot().error);
  fail = false;
  audio.play = () => Promise.reject(new Error("NotAllowedError"));
  player.toggle();
  await tick();
  assert.equal(player.getSnapshot().intent, false);
  assert(player.getSnapshot().error);
  audio.play = Media.prototype.play;
  player.toggle();
  await tick();
  assert.equal(audio.paused, false);
  player.dispose();
});

test("played state resets per track and download progress is observable and cancellable", async () => {
  let report;
  const { player, audio } = setup(async (_track, options) => {
    if (!options.download) return null;
    report = options.onProgress;
    return new Promise((_, reject) =>
      options.signal.addEventListener("abort", () =>
        reject(new DOMException("Cancelled", "AbortError")),
      ),
    );
  });
  player.setTrack(tracks[0]);
  await tick();
  assert.equal(player.getSnapshot().hasPlayed, false);
  player.toggle();
  await tick();
  report(0.45);
  assert.equal(player.getSnapshot().progress, 0.45);
  player.toggle();
  await tick();
  assert.equal(player.getSnapshot().busy, false);
  report(0.9);
  assert.equal(player.getSnapshot().progress, 0);
  audio.dispatchEvent(new Event("playing"));
  assert.equal(player.getSnapshot().hasPlayed, false);
  player.setTrack(tracks[1]);
  await tick();
  assert.equal(player.getSnapshot().hasPlayed, false);
  player.dispose();
});

test("cached navigation retains playback intent without a download state", async () => {
  let resolveNext;
  const { player } = setup((track) =>
    track.id === 1
      ? new Promise((resolve) => {
          resolveNext = resolve;
        })
      : Promise.resolve({ url: `track:${track.id}` }),
  );
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  await tick();
  const snapshots = [];
  player.subscribe(() => snapshots.push(player.getSnapshot()));
  player.setTrack(tracks[1]);
  assert.equal(player.getSnapshot().busy, true);
  assert.equal(player.getSnapshot().downloading, false);
  resolveNext({ url: "track:1" });
  await tick();
  assert(snapshots.every((state) => state.intent && !state.downloading));
  assert.equal(player.getSnapshot().playing, true);
  player.dispose();
});

test("only an actual uncached transfer enters the download state", async () => {
  let finish;
  const { player } = setup((track, { download }) =>
    download
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(null),
  );
  player.setTrack(tracks[0]);
  await tick();
  assert.equal(player.getSnapshot().checked, true);
  assert.equal(player.getSnapshot().downloading, false);
  player.toggle();
  assert.equal(player.getSnapshot().downloading, true);
  finish({ url: "track:0" });
  await tick();
  assert.equal(player.getSnapshot().downloading, false);
  assert.equal(player.getSnapshot().playing, true);
  player.dispose();
});

test("background pauses, blocks next-track advance, and requires explicit play on return", async () => {
  const { player, audio, advanced } = setup();
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  audio.currentTime = 12;
  audio.dispatchEvent(new Event("timeupdate"));
  player.setActive(false);
  assert.equal(audio.paused, true);
  assert.equal(player.getSnapshot().intent, false);
  audio.dispatchEvent(new Event("ended"));
  player.toggle();
  assert.equal(audio.paused, true);
  assert.deepEqual(advanced, []);
  player.setActive(true);
  assert.equal(audio.paused, true);
  assert.equal(player.getSnapshot().current, 12);
  player.toggle();
  assert.equal(audio.paused, false);
  player.dispose();
});

test("a download completing after backgrounding cannot start audio", async () => {
  let finish,
    signal,
    released = false;
  const { player, audio } = setup((track, options) => {
    if (!options.download) return Promise.resolve(null);
    signal = options.signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  player.setActive(false);
  assert.equal(signal.aborted, true);
  player.setActive(true);
  finish({
    url: "late",
    release: () => {
      released = true;
    },
  });
  await tick();
  assert.equal(audio.paused, true);
  assert.equal(player.getSnapshot().intent, false);
  assert.equal(player.getSnapshot().busy, false);
  assert.equal(released, true);
  player.dispose();
});

test("late playing events are stopped while inactive", async () => {
  const { player, audio } = setup();
  player.setTrack(tracks[0]);
  await tick();
  player.toggle();
  player.setActive(false);
  audio.paused = false;
  audio.dispatchEvent(new Event("playing"));
  assert.equal(audio.paused, true);
  assert.equal(player.getSnapshot().playing, false);
  player.dispose();
});

test("duplicate media ticks do not notify subscribers", async () => {
  const { player, audio } = setup();
  player.setTrack(tracks[0]);
  await tick();
  let updates = 0;
  player.subscribe(() => updates++);
  audio.dispatchEvent(new Event("timeupdate"));
  audio.dispatchEvent(new Event("timeupdate"));
  assert.equal(updates, 0);
  audio.currentTime = 1;
  audio.dispatchEvent(new Event("timeupdate"));
  assert.equal(updates, 1);
  player.dispose();
});
