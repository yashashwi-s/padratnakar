// One acquisition at a time: a late response after Pause must be released,
// never leave the screen awake or restart playback.
export function bindAudioScreenAwake(player, document, acquire) {
  let desired = false,
    held = null,
    pending = false,
    disposed = false;
  const reconcile = async () => {
    if (pending) return;
    if (!desired) {
      const release = held;
      held = null;
      if (release) {
        pending = true;
        try {
          await release();
        } catch {
          /* OS may already have released it. */
        }
        pending = false;
        if (desired) void reconcile();
      }
      return;
    }
    if (held) return;
    pending = true;
    try {
      held = await acquire();
    } catch {
      /* Playback works without wake-lock permission. */
    }
    pending = false;
    if (!desired) void reconcile();
  };
  const sync = () => {
    const state = player.getSnapshot();
    const next = !disposed && !document.hidden && state.playing && state.intent;
    if (next === desired) return;
    desired = next;
    void reconcile();
  };
  const unsubscribe = player.subscribe(sync);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    disposed = true;
    unsubscribe();
    document.removeEventListener("visibilitychange", sync);
    desired = false;
    void reconcile();
  };
}
