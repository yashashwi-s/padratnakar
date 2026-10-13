import { Capacitor, registerPlugin } from "@capacitor/core";

const AudioDownload = registerPlugin("AudioDownload");

// Only small progress messages and the finished file URI cross the bridge.
export async function downloadAndroidAudio(
  track,
  { signal, onProgress },
  plugin = AudioDownload,
) {
  signal.throwIfAborted();
  const requestId = crypto.randomUUID();
  const listener = await plugin.addListener("progress", (event) => {
    if (event.requestId === requestId && !signal.aborted)
      onProgress(Math.min(0.99, event.bytes / track.bytes));
  });
  const cancel = () => {
    plugin.cancel({ requestId }).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    const { uri } = await plugin.download({
      requestId,
      id: track.id,
      bytes: track.bytes,
      sha256: track.sha256,
    });
    signal.throwIfAborted();
    onProgress(1);
    return { url: Capacitor.convertFileSrc(uri) };
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    await listener.remove().catch(() => {});
  }
}
