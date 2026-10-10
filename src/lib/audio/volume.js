import { Capacitor, registerPlugin } from "@capacitor/core";
const AudioVolume = registerPlugin("AudioVolume");
export async function lowMediaVolume() {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    const { level } = await AudioVolume.getLevel();
    return level <= 0.2;
  } catch {
    return false;
  }
}
