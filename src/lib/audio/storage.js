import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

const origin = "https://raw.githubusercontent.com/yashashwi-s/padratnakar/main/public";
const cacheName = "shodash-recordings-v1";
const asBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export async function audioSource(
  track,
  { download, signal, onProgress = () => {} },
) {
  const native = Capacitor.isNativePlatform();
  const path = `audio/shodash/${track.id}-${track.sha256.slice(0, 12)}.mp3`;
  const url = `${native ? origin : ""}${track.file}`;
  let cache;
  if (native) {
    try {
      const info = await Filesystem.stat({ path, directory: Directory.Data });
      if (info.size === track.bytes) {
        const { uri } = await Filesystem.getUri({
          path,
          directory: Directory.Data,
        });
        return { url: Capacitor.convertFileSrc(uri) };
      }
    } catch {
      /* Not downloaded yet. */
    }
  } else {
    cache = await caches.open(cacheName);
    const cached = await cache.match(`${track.file}?v=${track.sha256}`);
    if (cached) return blobSource(await cached.blob());
  }
  if (!download) return null;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Audio download failed");
  let bytes;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress(Math.min(0.99, received / track.bytes));
    }
    const joined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    bytes = joined.buffer;
  } else bytes = await response.arrayBuffer();
  if (bytes.byteLength !== track.bytes) throw new Error("Incomplete recording");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== track.sha256)
    throw new Error("Recording integrity check failed");
  signal.throwIfAborted();
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  if (native) {
    await Filesystem.writeFile({
      path,
      directory: Directory.Data,
      data: await asBase64(blob),
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({
      path,
      directory: Directory.Data,
    });
    onProgress(1);
    return { url: Capacitor.convertFileSrc(uri) };
  }
  await cache.put(
    `${track.file}?v=${track.sha256}`,
    new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }),
  );
  // Browsers may decline persistence; downloads still work in ordinary storage.
  navigator.storage?.persist?.().catch(() => {});
  onProgress(1);
  return blobSource(blob);
}
function blobSource(blob) {
  const url = URL.createObjectURL(blob);
  return { url, release: () => URL.revokeObjectURL(url) };
}
