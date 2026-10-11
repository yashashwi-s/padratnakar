// Both the document and native activity must be visible before Play is allowed.
// Returning to the foreground never restores playback intent.
export function bindAudioLifecycle(player, document, nativeApp) {
  let disposed = false;
  let nativeActive = !nativeApp;
  let revision = 0;
  let listener;
  const sync = () => {
    if (!disposed) player.setActive(nativeActive && !document.hidden);
  };
  const hide = () => player.setActive(false);
  document.addEventListener("visibilitychange", sync);
  document.defaultView?.addEventListener("pagehide", hide);
  document.defaultView?.addEventListener("pageshow", sync);
  sync();
  if (nativeApp) {
    Promise.resolve(
      nativeApp.addListener("appStateChange", ({ isActive }) => {
        revision++;
        nativeActive = isActive;
        sync();
      }),
    )
      .then((handle) => {
        if (disposed) void handle.remove();
        else listener = handle;
      })
      .catch(() => {});
    const initialRevision = revision;
    nativeApp
      .getState()
      .then(({ isActive }) => {
        if (revision !== initialRevision) return;
        nativeActive = isActive;
        sync();
      })
      .catch(() => {});
  }
  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", sync);
    document.defaultView?.removeEventListener("pagehide", hide);
    document.defaultView?.removeEventListener("pageshow", sync);
    void listener?.remove();
  };
}
