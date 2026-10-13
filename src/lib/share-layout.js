// Keep the original tap pending while lazy geometry, artwork and font metrics
// arrive. Timers also run when WebView has no animation frame to deliver.
export function waitForShareLayout(svg, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    let timer;
    const check = () => {
      if (!svg.isConnected) {
        reject(new Error("Reader page changed"));
      } else if (svg.dataset.shareReady === "true") {
        resolve();
      } else if (Date.now() >= deadline) {
        reject(new Error("Reader layout is not ready"));
      } else {
        timer = setTimeout(check, 50);
        return;
      }
      clearTimeout(timer);
    };
    check();
  });
}
