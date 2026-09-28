import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Capacitor } from "@capacitor/core";
import { loadReaderFont } from "./lib/reader-font";

// Register the PWA service worker only in a real browser environment.
// Capacitor WebViews do not need it and it can interfere with their
// internal asset routing.
if (
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform() &&
  "serviceWorker" in navigator
) {
  // vite-plugin-pwa emits sw.js at the root of the build.
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // SW registration is non-critical; reading still works without it.
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// A single quiet handoff after fonts and the first reader frame are ready.
Promise.all([
  loadReaderFont().catch(() => {}),
  new Promise((resolve) => setTimeout(resolve, 450)),
]).then(() => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const screen = document.getElementById("launch-screen");
      if (!screen) return;
      screen.style.opacity = "0";
      setTimeout(() => screen.remove(), 320);
    }),
  );
});
