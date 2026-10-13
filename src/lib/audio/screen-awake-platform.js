import { Capacitor, registerPlugin } from "@capacitor/core";
const AudioScreen = registerPlugin("AudioScreen");
export async function acquireAudioScreen() {
  if (Capacitor.getPlatform() === "android") {
    await AudioScreen.setAwake({ awake: true });
    return () => AudioScreen.setAwake({ awake: false });
  }
  const lock = await navigator.wakeLock?.request("screen");
  return lock ? () => lock.release() : null;
}
