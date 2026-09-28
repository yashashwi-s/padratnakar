import { performance } from "node:perf_hooks";
import { createSearchService } from "../../src/lib/search-service.js";
import { searchDocuments } from "../../src/lib/search-catalog.js";

const start = performance.now();
const search = createSearchService(searchDocuments());
console.log(
  `Index build: ${Math.round(performance.now() - start)} ms (runs in worker in app)`,
);
for (const query of [
  "प्रेम",
  "radha",
  "krishna",
  "ram",
  "dou chakor",
  "radha प्रेम",
  "!!!",
  "१५०८",
]) {
  const times = [];
  let results;
  for (let i = 0; i < 21; i++) {
    const t = performance.now();
    results = search(query);
    if (i) times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      query,
      medianMs: +times[10].toFixed(2),
      p95Ms: +times[18].toFixed(2),
      mainResults: results.pad.length,
    }),
  );
}
