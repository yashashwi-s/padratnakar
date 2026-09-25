import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Capacitor } from "@capacitor/core";

// Register the PWA service worker only in a real browser environment.
// Capacitor WebViews do not need it and it can interfere with their
// internal asset routing.
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  // vite-plugin-pwa emits sw.js at the root of the build.
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch(() => {
      // SW registration is non-critical; reading still works without it.
    });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
