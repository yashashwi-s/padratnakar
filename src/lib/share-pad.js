import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Clipboard } from "@capacitor/clipboard";

// Reserved placeholder domains: replace with published links before release.
export const DOWNLOADS = {
  android: "https://padratnakar.example/android",
  ios: "https://padratnakar.example/ios",
};
export function shareLink(mode, id) {
  return `https://padratnakar.example/#/${mode}/${id}`;
}
function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
let font;
async function embeddedFont() {
  font ||= fetch("/fonts/NotoSerifDevanagari.ttf")
    .then((response) => {
      if (!response.ok) throw new Error("Font could not load");
      return response.blob();
    })
    .then(asDataUrl)
    .catch((error) => {
      font = null;
      throw error;
    });
  return font;
}

/** Export the same positioned Unicode SVG, including footnotes, into one full-pad PNG. */
export async function padImage(svg) {
  const clone = svg.cloneNode(true);
  const { x, y, width, height } = svg.viewBox.baseVal;
  const totalHeight = height;
  const ns = "http://www.w3.org/2000/svg";
  clone.setAttribute("xmlns", ns);
  clone.setAttribute("viewBox", `${x} ${y} ${width} ${totalHeight}`);
  const scale = Math.min(3, 12000 / totalHeight);
  clone.setAttribute("width", String(Math.ceil(width * scale)));
  clone.setAttribute("height", String(Math.ceil(totalHeight * scale)));
  clone.removeAttribute("class");
  clone.setAttribute(
    "style",
    "font-family:PadExport; font-weight:700; fill:black; background:white",
  );
  const original = [svg, ...svg.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  original.forEach((element, i) => {
    if (["text", "tspan", "g"].includes(element.tagName)) {
      copies[i].style.fontWeight = getComputedStyle(element).fontWeight;
      copies[i].style.whiteSpace = "pre";
    }
  });
  await document.fonts.ready;
  const fontData = await embeddedFont();
  const style = document.createElementNS(ns, "style");
  style.textContent = `@font-face{font-family:PadExport;src:url(${fontData}) format('truetype');font-weight:100 900}`;
  clone.prepend(style);
  const background = document.createElementNS(ns, "rect");
  for (const [key, value] of Object.entries({
    x,
    y,
    width,
    height: totalHeight,
    fill: "white",
  }))
    background.setAttribute(key, String(value));
  clone.prepend(background);
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(totalHeight * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image export failed")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Keep just the two most recently prepared pictures, not the entire corpus.
const prepared = new Map();
export function preparePadShare(svg, key) {
  if (prepared.has(key)) return prepared.get(key);
  const result = padImage(svg)
    .then(async (blob) => ({
      blob,
      data: Capacitor.isNativePlatform()
        ? (await asDataUrl(blob)).split(",")[1]
        : null,
      uri: null,
    }))
    .catch((error) => {
      prepared.delete(key);
      throw error;
    });
  prepared.set(key, result);
  while (prepared.size > 2) prepared.delete(prepared.keys().next().value);
  return result;
}
export async function sharePad(svg, mode, id) {
  const link = shareLink(mode, id),
    title = "पद रत्नाकर";
  const picture = await preparePadShare(svg, `${mode}-${id}`);
  const { blob } = picture;
  const name = `pad-ratnakar-${mode}-${id}.png`;
  const text = `${link}\nDownload the app Pad Ratnakar (placeholder links):\nAndroid: ${DOWNLOADS.android}\niOS: ${DOWNLOADS.ios}`;
  if (Capacitor.isNativePlatform()) {
    if (!picture.uri) {
      const saved = await Filesystem.writeFile({
        path: `shared/${name}`,
        data: picture.data,
        directory: Directory.Cache,
        recursive: true,
      });
      picture.uri = saved.uri;
    }
    await Share.share({
      title,
      text,
      files: [picture.uri],
      dialogTitle: "पद साझा करें",
    });
    return "shared";
  }
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return "shared";
  }
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "downloaded";
}
export async function copyPad(text) {
  await Clipboard.write({ string: text });
}
