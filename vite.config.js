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
      injectRegister: null,
      // Activate updates on the next visit, without replacing a reading session.
      registerType: "prompt",
      workbox: {
        // Revisioned geometry is part of the offline book, including unread pads.
        globPatterns: [
          "**/*.{js,css,html,woff,woff2,ttf}",
          "icons/*.png",
          "brand/pad-ratnakar.png",
          "data/layout/*.json",
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
        // Keep the current reader and its cache version together until closed.
        skipWaiting: false,
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
            // Dedicated padded icon keeps lettering inside adaptive masks.
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
