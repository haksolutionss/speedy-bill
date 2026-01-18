import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON === "true";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    // Electron needs relative paths for production
    base: isElectron ? "./" : "/",
    plugins: [
      react(),
      mode === "development" ? componentTagger() : null,
      !isElectron
        ? VitePWA({
          registerType: "autoUpdate",
          manifest: {
            name: "HotelAqsa POS",
            short_name: "HotelAqsa",
            description: "Fast, keyboard-first restaurant billing system",
            theme_color: "#1a9585",
            background_color: "#ffffff",
            display: "standalone",
            start_url: "/",
            icons: [
              { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
              { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
            ]
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
          }
        })
        : null
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

