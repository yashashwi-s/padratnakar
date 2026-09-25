import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Write the service worker to sw.js at the root of the output.
      filename: "sw.js",
      // Register it automatically via a tiny injected script — skip for
      // Capacitor WebViews because we detect native in main.jsx.
      injectRegister: null, // we register manually in main.jsx
      // Triggers a skipWaiting + clients.claim on activation so users
      // always get the latest build without needing a manual refresh.
      registerType: "autoUpdate",
      // Only precache the app-shell: JS, CSS, HTML, fonts, icons.
      // The 16 layout JSON files (8 MB total) are runtime-cached instead
      // so first install stays lean.
      workbox: {
        // Precache everything Vite emits EXCEPT the large layout corpus.
        globPatterns: [
          "**/*.{js,css,html,woff,woff2,ttf}",
          "icons/*.png",
          "brand/pad-ratnakar.png",
        ],
        globIgnores: ["**/data/layout/**"],
        // Runtime caching for layout JSON chunks (corpus data).
        runtimeCaching: [
          {
            urlPattern: /\/data\/layout\/\d+\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "pad-layout-v1",
              expiration: {
                // Keep up to 16 entries (all chunks) indefinitely;
                // they are regenerated only on data:rebuild.
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
        // SPA navigation fallback: serve index.html for any
        // non-asset navigation request so /pad/N and /shodash/N
        // work when offline (or on first install before Vercel
        // rewrites kick in). This mirrors the vercel.json rewrites
        // for the SW layer.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/review/,
          /^\/fonts\//,
          /^\/brand\//,
          /^\/icons\//,
          /^\/data\//,
        ],
        // Increase precache size limit; our main JS bundle is ~6 MB.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Clean stale caches from previous SW versions on activation.
        cleanupOutdatedCaches: true,
        // Skip waiting so the new SW activates immediately.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: "पद रत्नाकर",
        short_name: "पद रत्नाकर",
        description:
          "श्रीहनुमानप्रसाद पोद्दार का पद रत्नाकर — सम्पूर्ण पद एवं षोडशगीत।",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // No orientation lock — the reader works fine in both.
        background_color: "#f4efe4",
        theme_color: "#f4efe4",
        lang: "hi",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            // Maskable variant re-uses the same image; the 1254×1254
            // source has ample safe-zone for the 80% mask circle.
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
