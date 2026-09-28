import { createSearchService } from "./search-service.js";
let search;
let timer;
self.onmessage = ({ data }) => {
  if (data.type === "init") {
    try {
      search = createSearchService(data.documents);
    } catch {
      self.postMessage({ error: true });
    }
    return;
  }
  // Coalesce queued keystrokes after the initial index build.
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      self.postMessage({ id: data.id, results: search(data.query) });
    } catch {
      self.postMessage({ id: data.id, error: true });
    }
  }, 0);
};
