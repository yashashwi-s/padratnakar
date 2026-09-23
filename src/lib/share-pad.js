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
export async function padImage(svg, link) {
  const clone = svg.cloneNode(true);
  const { x, y, width, height } = svg.viewBox.baseVal;
  const totalHeight = height + 90;
  const ns = "http://www.w3.org/2000/svg";
  clone.setAttribute("xmlns", ns);
  clone.setAttribute("viewBox", `${x} ${y} ${width} ${totalHeight}`);
  const scale = Math.min(4, 14000 / totalHeight);
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
  const footer = [
    "पद रत्नाकर",
    link,
    "Download the app Pad Ratnakar (links coming soon)",
    `Android: ${DOWNLOADS.android}`,
    `iOS: ${DOWNLOADS.ios}`,
  ];
  footer.forEach((line, i) => {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(x + width / 2));
    text.setAttribute("y", String(height + 12 + i * 14));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", i ? "7" : "12");
    if (i) text.setAttribute("font-family", "sans-serif");
    text.textContent = line;
    clone.append(text);
  });
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
export async function sharePad(svg, mode, id) {
  const link = shareLink(mode, id),
    title = "पद रत्नाकर";
  const blob = await padImage(svg, link);
  const name = `pad-ratnakar-${mode}-${id}.png`;
  const text = `${link}\nDownload the app Pad Ratnakar (placeholder links):\nAndroid: ${DOWNLOADS.android}\niOS: ${DOWNLOADS.ios}`;
  if (Capacitor.isNativePlatform()) {
    const data = await asDataUrl(blob);
    const saved = await Filesystem.writeFile({
      path: `shared/${name}`,
      data: data.split(",")[1],
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title,
      text,
      files: [saved.uri],
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
