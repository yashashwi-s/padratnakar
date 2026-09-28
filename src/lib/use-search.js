import { useEffect, useState } from "react";
import { searchCollections, searchDocuments } from "./search-catalog.js";

let worker;
let sequence = 0;
const pending = new Map();
const pads = new Map(
  searchCollections.map((c) => [c.mode, new Map(c.pads.map((p) => [p.id, p]))]),
);
function fail() {
  worker?.terminate();
  worker = null;
  for (const callback of pending.values()) callback({ error: true });
  pending.clear();
}
function request(query, callback) {
  if (!worker) {
    worker = new Worker(new URL("./search.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.error && data.id == null) {
        fail();
        return;
      }
      pending.get(data.id)?.(data);
      pending.delete(data.id);
    };
    worker.onerror = fail;
    worker.postMessage({ type: "init", documents: searchDocuments() });
  }
  const id = ++sequence;
  pending.set(id, callback);
  worker.postMessage({ id, query });
  return () => pending.delete(id);
}
export function useSearch(query) {
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!query.trim()) return;
    let cancel;
    try {
      cancel = request(query, (data) => {
        setState({
          query,
          attempt,
          error: data.error,
          results:
            data.results &&
            Object.fromEntries(
              Object.entries(data.results).map(([mode, results]) => [
                mode,
                results.map((r) => ({ ...r, pad: pads.get(mode).get(r.id) })),
              ]),
            ),
        });
      });
    } catch {
      fail();
      const timer = setTimeout(
        () => setState({ query, attempt, error: true }),
        0,
      );
      cancel = () => clearTimeout(timer);
    }
    return () => cancel?.();
  }, [query, attempt]);
  const current = state?.query === query && state?.attempt === attempt;
  return {
    results: current ? state.results : null,
    error: current && state.error,
    loading: Boolean(query.trim()) && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
