// The player is independent of React so playback and download races can be
// tested without a browser. Only the small transport subscribes to time ticks.
export function createAudioController({ audio, source, onAdvance }) {
  let track = null,
    generation = 0,
    abort,
    release;
  let state = {
    id: null,
    checked: false,
    hasPlayed: false,
    progress: 0,
    ready: false,
    busy: false,
    downloading: false,
    playing: false,
    intent: false,
    current: 0,
    duration: 0,
    error: "",
  };
  const listeners = new Set();
  const update = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  const pause = () => {
    update({ intent: false, playing: false });
    audio.pause();
  };
  async function start() {
    const ticket = generation;
    if (audio.ended || (state.duration && state.current >= state.duration))
      audio.currentTime = 0;
    try {
      await audio.play();
      if (ticket === generation && !state.intent) audio.pause();
    } catch {
      if (ticket === generation)
        update({
          intent: false,
          playing: false,
          error: "Tap Play again to start audio.",
        });
    }
  }
  async function load(download) {
    const ticket = ++generation;
    abort?.abort();
    abort = new AbortController();
    update({ busy: true, downloading: download, progress: 0, error: "" });
    try {
      const result = await source(track, {
        download,
        signal: abort.signal,
        onProgress: (progress) => {
          if (ticket === generation) update({ progress });
        },
      });
      if (ticket !== generation) {
        result?.release?.();
        return;
      }
      if (result) {
        release?.();
        release = result.release;
        audio.src = result.url;
        audio.load();
      }
      update({
        ready: Boolean(result),
        checked: true,
        busy: false,
        downloading: false,
      });
      if (state.intent) {
        if (result) await start();
        else await load(true);
      }
    } catch (error) {
      if (ticket === generation && error.name !== "AbortError")
        update({
          busy: false,
          downloading: false,
          intent: false,
          playing: false,
          error:
            "Could not download audio. Check your connection and try again.",
        });
    }
  }
  const events = {
    timeupdate: () => update({ current: audio.currentTime }),
    loadedmetadata: () =>
      update({
        duration: Number.isFinite(audio.duration)
          ? audio.duration
          : track?.duration || 0,
      }),
    playing: () => update({ playing: true, hasPlayed: true, error: "" }),
    pause: () => update({ playing: false }),
    error: () => {
      if (track)
        update({
          playing: false,
          intent: false,
          error: "Could not play audio. Please try again.",
        });
    },
    ended: () => {
      if (state.intent && track && track.id < 17) onAdvance(track.id + 1);
      else pause();
    },
  };
  for (const [name, handler] of Object.entries(events))
    audio.addEventListener(name, handler);
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => state,
    setTrack(next) {
      if (track?.id === next?.id) return;
      const keepPlaying = state.intent && Boolean(next);
      ++generation;
      abort?.abort();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      release?.();
      release = null;
      track = next;
      update({
        id: next?.id ?? null,
        checked: false,
        hasPlayed: false,
        progress: 0,
        ready: false,
        busy: false,
        downloading: false,
        playing: false,
        intent: keepPlaying,
        current: 0,
        duration: next?.duration || 0,
        error: "",
      });
      if (next) void load(false);
    },
    toggle() {
      if (!track) return;
      if (state.intent) {
        if (state.busy && !state.ready) {
          ++generation;
          abort?.abort();
          update({ busy: false, downloading: false, progress: 0 });
        }
        pause();
        return;
      }
      update({ intent: true, error: "" });
      if (!state.busy) {
        if (state.ready) void start();
        else void load(true);
      }
    },
    seek(value) {
      if (!state.ready || !Number.isFinite(value)) return;
      audio.currentTime = Math.max(0, Math.min(state.duration, value));
      update({ current: audio.currentTime });
    },
    dispose() {
      ++generation;
      abort?.abort();
      for (const [name, handler] of Object.entries(events))
        audio.removeEventListener(name, handler);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      release?.();
      listeners.clear();
    },
  };
}
