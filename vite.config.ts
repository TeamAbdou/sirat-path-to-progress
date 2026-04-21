import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: "صِراط - Sirat",
        short_name: "Sirat",
        description: "Your path to positive change",
        theme_color: "#10b981",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64",
            type: "image/x-icon",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react/jsx-runtime", "react-router-dom"],
    exclude: ["@mlc-ai/web-llm"],
  },
}));
