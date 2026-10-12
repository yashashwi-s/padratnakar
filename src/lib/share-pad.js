import { captureShareText, drawShareText } from "./share-canvas.js";
import { routePath } from "./collection-routes.js";
import { readerBorderMarkup } from "./reader-borders.js";
import { loadReaderFont } from "./reader-font.js";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Clipboard } from "@capacitor/clipboard";

export const SITE_ORIGIN = "https://padratnakar.vercel.app";
export function shareLink(mode, id) {
  return `${SITE_ORIGIN}${routePath(mode, id)}`;
}

export function shareFooter(mode, id) {
  return `${shareLink(mode, id)}\n\nDownload App:\niOS - ${SITE_ORIGIN}/ios\nAndroid - ${SITE_ORIGIN}/android`;
}
export function copiedPadText(text, mode, id) {
  return `${text}\n\n${shareFooter(mode, id)}`;
}
export function warmShareResources() {
  return loadReaderFont();
}

function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
/** Export the same positioned Unicode SVG, including footnotes, into one full-pad PNG. */
export async function padImage(svg, work = {}) {
  // Native prewarming can finish loading its font/image while the user starts
  // pinching. Yield before expensive cloning and rasterization in that case.
  const yieldForInteraction = async () => {
    if (!work.background) return;
    while (
      work.background &&
      (document.hidden ||
        svg.closest(".print-viewport")?.dataset.pinching === "true")
    ) {
      if (!svg.isConnected) throw new Error("Reader page changed");
      await new Promise((resolve) => {
        const resume = () => {
          clearTimeout(timer);
          work.resume = null;
          resolve();
        };
        const timer = setTimeout(resume, 200);
        work.resume = resume;
      });
    }
    if (!svg.isConnected) throw new Error("Reader page changed");
  };
  await yieldForInteraction();
  await loadReaderFont();
  await yieldForInteraction();
  const textRuns = captureShareText(svg);
  const clone = svg.cloneNode(true);
  clone.querySelectorAll(".print-line").forEach((line) => line.remove());
  const { x, y, width, height } = svg.viewBox.baseVal;
  const totalHeight = Math.min(
    height,
    Number(svg.dataset.contentHeight) || height,
  );
  const border = clone.querySelector("[data-border-design]");
  if (border && totalHeight !== height)
    border.innerHTML = readerBorderMarkup(
      Number(border.dataset.borderIndex),
      width,
      totalHeight,
      "export-border",
    );
  const ns = "http://www.w3.org/2000/svg";
  clone.setAttribute("xmlns", ns);
  clone.setAttribute("viewBox", `${x} ${y} ${width} ${totalHeight}`);
  const scale = Math.min(2, 1080 / width, 12000 / totalHeight);
  clone.setAttribute("width", String(Math.ceil(width * scale)));
  clone.setAttribute("height", String(Math.ceil(totalHeight * scale)));
  clone.removeAttribute("class");
  clone.setAttribute(
    "style",
    "font-family:PadExport; font-weight:700; fill:black; background:white",
  );
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
    await yieldForInteraction();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(totalHeight * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(scale, scale);
    context.translate(-x, -y);
    drawShareText(context, textRuns);
    context.restore();
    // WebView can defer toBlob's idle encoder until another input arrives.
    // Encode the bounded canvas now; no idle callback or extra tap is needed.
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Keep just the two most recently prepared pictures, not the entire corpus.
const prepared = new Map();
export function padShareRevision(svg) {
  // Pinch transforms, viewport dimensions and instance IDs do not change the
  // content of a shared page. Avoid throwing away a prepared file after zoom.
  return `${svg.dataset.contentHeight}|${svg.dataset.artReady}|${svg.dataset.artRevision || ""}|${svg.viewBox.baseVal.width}|${svg.querySelector("[data-border-design]")?.dataset.borderIndex}|${[...svg.querySelectorAll(".print-line")].map((line) => line.outerHTML).join("")}`;
}
export function preparePadShare(svg, key, options) {
  const revision = padShareRevision(svg);
  const cached = prepared.get(key);
  if (cached?.revision === revision) {
    if (!options?.background) {
      // A tap takes ownership of speculative work. Never leave the share
      // sheet waiting on a background interaction/idle gate.
      cached.work.background = false;
      cached.work.resume?.();
    }
    return cached.result;
  }
  const work = { background: Boolean(options?.background), resume: null };
  const result = padImage(svg, work)
    .then(async (blob) => {
      let uri = null;
      if (Capacitor.isNativePlatform()) {
        const data = (
          typeof blob === "string" ? blob : await asDataUrl(blob)
        ).split(",")[1];
        const saved = await Filesystem.writeFile({
          path: `shared/pad-ratnakar-${key}.png`,
          data,
          directory: Directory.Cache,
          recursive: true,
        });
        uri = saved.uri;
      }
      return { blob, uri };
    })
    .catch((error) => {
      if (prepared.get(key)?.result === result) prepared.delete(key);
      throw error;
    });
  prepared.set(key, { revision, result, work });
  while (prepared.size > 2) prepared.delete(prepared.keys().next().value);
  return result;
}
export async function sharePad(svg, mode, id) {
  const title = "पद रत्नाकर";

  // Website/PWA: share or copy the readable pad text + canonical web link.
  // Do NOT generate or attach a PNG on the web.
  if (!Capacitor.isNativePlatform()) {
    const padText = [...svg.querySelectorAll(".print-line")]
      .map((line) => line.textContent)
      .join("\n");
    const text = copiedPadText(padText, mode, id);
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
    await Clipboard.write({ string: text });
    return "copied";
  }

  // Native Android/iOS: keep existing image share behavior.
  await loadReaderFont();
  // Let font measurements and heading fitting commit before capturing the SVG.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  if (!svg.isConnected || svg.dataset.shareReady !== "true")
    throw new Error("Reader layout is not ready");
  const picture = await preparePadShare(svg, `${mode}-${id}`);
  const text = shareFooter(mode, id);
  await Share.share({
    title,
    text,
    files: [picture.uri],
    dialogTitle: "पद साझा करें",
  });
  return "shared";
}
export async function copyPad(text) {
  await Clipboard.write({ string: text });
}
