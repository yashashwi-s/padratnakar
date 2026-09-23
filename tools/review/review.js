const $ = (id) => document.getElementById(id);
const records = new Map();
const initial = Number(
  location.hash.slice(1) || localStorage.getItem("pad-review-position") || 1,
);
let current =
  Number.isInteger(initial) && initial >= 1 && initial <= 1565 ? initial : 1;
let timer,
  busy = true,
  revision = 0,
  sourceRequest = 0,
  frameReady = false;
let chain = Promise.resolve();
let lastSaved = "";
const draftKey = (id) => `pad-format-review-draft-${id}`;
const labels = {
  pending: "Not reviewed",
  issue: "Format issue",
  verified: "Verified",
};
function message(text, error = false) {
  $("save-state").textContent = text;
  $("save-state").classList.toggle("error", error);
}
function payload() {
  return {
    comment: $("comment").value,
    status: $("status").dataset.status || "pending",
    viewport: {
      width: Number($("width").value),
      height: Number($("width").value) * 2,
    },
  };
}
function progress() {
  const values = [...records.values()];
  $("progress").textContent =
    `${values.filter((x) => x.status === "verified").length} verified · ${values.filter((x) => x.status === "issue").length} flagged`;
}
function status(value) {
  $("status").dataset.status = value;
  $("status").textContent = labels[value];
}
function stash() {
  const data = payload();
  localStorage.setItem(draftKey(current), JSON.stringify(data));
  return data;
}
async function save() {
  clearTimeout(timer);
  const id = current,
    data = stash(),
    version = revision,
    serialized = JSON.stringify(data);
  if (serialized === lastSaved) return chain;
  message("Saving…");
  const task = chain
    .catch(() => {})
    .then(async () => {
      const response = await fetch(`/api/review/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      });
      if (!response.ok) throw new Error("Save failed");
      records.set(id, { pad: id, ...data });
      progress();
      if (id === current && version === revision) {
        lastSaved = serialized;
        localStorage.removeItem(draftKey(id));
        message("Saved on this computer");
      }
    });
  chain = task;
  try {
    await task;
  } catch (error) {
    message(
      "Not saved to disk. Draft kept here. Try again before leaving.",
      true,
    );
    throw error;
  }
}
function sizePhone() {
  const width = Number($("width").value),
    height = width * 2,
    space = $("phone-space");
  const scale = Math.min(
    1,
    (space.clientWidth - 6) / width,
    (space.clientHeight - 10) / height,
  );
  Object.assign($("phone").style, {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translateX(-50%) scale(${scale})`,
  });
}
async function sources() {
  const request = ++sourceRequest,
    id = current;
  $("pdf").textContent = "Loading source pages…";
  try {
    const response = await fetch(`/api/pad/${id}`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (request !== sourceRequest) return;
    $("pdf").replaceChildren();
    for (const page of data.pages) {
      const figure = document.createElement("figure"),
        caption = document.createElement("figcaption"),
        img = document.createElement("img"),
        link = document.createElement("a");
      caption.textContent = `PDF page ${page} · Pad ${id}`;
      img.src = `/api/image/${id}?page=${page}&full=${$("full").checked ? 1 : 0}`;
      img.alt = `Original PDF page ${page}, pad ${id}`;
      img.loading = "eager";
      img.onerror = () => {
        caption.textContent += " — image failed; reload this page";
      };
      link.href = img.src;
      link.target = "_blank";
      link.title = "Open image at full size";
      link.append(img);
      figure.append(caption, link);
      $("pdf").append(figure);
    }
    $("pdf").scrollTop = 0;
  } catch {
    if (request === sourceRequest)
      $("pdf").textContent = "Could not load PDF. Keep your comment and retry.";
  }
}
function load(id) {
  current = id;
  revision++;
  $("pad").value = id;
  history.replaceState(null, "", `#${id}`);
  localStorage.setItem("pad-review-position", id);
  const persisted = records.get(id) || { comment: "", status: "pending" };
  let draft;
  try {
    draft = JSON.parse(localStorage.getItem(draftKey(id)));
  } catch {
    /* ignore malformed local draft */
  }
  const value = draft || persisted;
  $("comment").value = value.comment;
  status(value.status);
  lastSaved = draft ? "" : JSON.stringify(payload());
  message(draft ? "Recovered draft · saving…" : "Saved on this computer");
  frameReady = false;
  $("app").src = `/#/pad/${id}`;
  sources();
  sizePhone();
  if (draft) save().catch(() => {});
}
async function move(id, decision) {
  if (busy) return;
  busy = true;
  $("comment").disabled = true;
  document
    .querySelectorAll(".controls button")
    .forEach((b) => (b.disabled = true));
  try {
    if (decision) {
      status(decision);
      revision++;
    }
    await save();
    if (id >= 1 && id <= 1565 && id !== current) load(id);
    else message("Saved · end of collection");
  } catch {
    /* stay on this pad until the disk save succeeds */
  } finally {
    busy = false;
    $("comment").disabled = false;
    document
      .querySelectorAll(".controls button")
      .forEach((b) => (b.disabled = false));
    $("comment").focus({ preventScroll: true });
  }
}
$("comment").addEventListener("input", () => {
  revision++;
  stash();
  message("Draft saved · saving to disk…");
  clearTimeout(timer);
  timer = setTimeout(() => save().catch(() => {}), 400);
});
$("verify").onclick = () => move(current + 1, "verified");
$("issue").onclick = () => move(current + 1, "issue");
$("next").onclick = () =>
  move(
    current + 1,
    $("comment").value.trim() && payload().status === "pending"
      ? "issue"
      : undefined,
  );
$("prev").onclick = () => move(current - 1);
$("reset").onclick = () => {
  status("pending");
  revision++;
  save().catch(() => {});
};
$("pending").onclick = () => {
  const candidates = Array.from(
    { length: 1565 },
    (_, i) => ((current + i) % 1565) + 1,
  );
  const id = candidates.find(
    (id) => !records.has(id) || records.get(id).status === "pending",
  );
  if (id) move(id);
  else message("All pads have a review decision.");
};
$("jump").onsubmit = (event) => {
  event.preventDefault();
  const id = Number($("pad").value);
  if (Number.isInteger(id) && id >= 1 && id <= 1565) move(id);
};
$("width").onchange = () => {
  sizePhone();
  revision++;
  stash();
  save().catch(() => {});
};
$("full").onchange = sources;
new ResizeObserver(sizePhone).observe($("phone-space"));
function shortcuts(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    move(current + 1, event.shiftKey ? "issue" : "verified");
  }
  if (event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    $("next").click();
  }
  if (event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    move(current - 1);
  }
}
window.addEventListener("keydown", shortcuts);
$("app").addEventListener("load", () => {
  frameReady = true;
  try {
    $("app").contentWindow.addEventListener("keydown", shortcuts);
  } catch {
    /* frame unavailable */
  }
});
window.addEventListener("beforeunload", () => {
  if (JSON.stringify(payload()) !== lastSaved) stash();
});
$("export").onclick = async (event) => {
  event.preventDefault();
  try {
    await save();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported: new Date().toISOString(),
            reviews: [...records.values()],
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "pad-format-comments.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* keep save warning */
  }
};
// Keep the review aligned if navigation happens inside the actual app.
setInterval(() => {
  if (busy || !frameReady) return;
  try {
    const match = $("app").contentWindow.location.hash.match(/^#\/pad\/(\d+)$/);
    if (match && Number(match[1]) !== current) move(Number(match[1]));
  } catch {
    /* iframe still loading */
  }
}, 500);
document
  .querySelectorAll(".controls button, .controls input, .controls textarea")
  .forEach((element) => (element.disabled = true));
try {
  const response = await fetch("/api/reviews");
  if (!response.ok) throw new Error();
  const data = await response.json();
  data.reviews.forEach((row) => records.set(row.pad, row));
  progress();
  busy = false;
  document
    .querySelectorAll(".controls button, .controls input, .controls textarea")
    .forEach((element) => (element.disabled = false));
  load(current);
} catch {
  message(
    "Review store unavailable. Reload after starting the local server.",
    true,
  );
}
