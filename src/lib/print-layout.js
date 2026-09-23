// Geometry is loaded in 100-pad chunks, separately from the initial app bundle.
const pending = new Map();
export async function getPrintLayout(id) {
  const padId = Number(id);
  if (!Number.isInteger(padId) || padId < 1 || padId > 1565) return undefined;
  const chunk = Math.floor((padId - 1) / 100) + 1;
  if (!pending.has(chunk)) {
    const base = import.meta.env?.BASE_URL ?? "/";
    const request = fetch(`${base}data/layout/${chunk}.json`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Layout data unavailable (${response.status})`);
        return response.json();
      })
      .catch((error) => {
        pending.delete(chunk);
        throw error;
      });
    pending.set(chunk, request);
  }
  return (await pending.get(chunk))[String(padId)];
}
