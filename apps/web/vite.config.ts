import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const rootEnvironment = loadEnv(mode, "../../", "");
  const webPort = Number(rootEnvironment.WEB_PORT || 5173);
  const apiTarget = rootEnvironment.API_PROXY_TARGET || "http://127.0.0.1:3000";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "offline.html"],
        manifest: {
          name: "BAC-2027",
          short_name: "BAC-2027",
          description: "Votre espace personnel de préparation au BAC.",
          lang: "fr",
          start_url: "/",
          display: "standalone",
          background_color: "#f5f8f7",
          theme_color: "#0b3d2e",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: webPort,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: webPort,
      allowedHosts: true,
    },
  };
});
