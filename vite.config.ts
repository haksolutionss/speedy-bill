import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  // Always use relative paths for Electron compatibility
  // Hash router handles routing in both web and Electron
  const base = "./";

  return {
    server: {
      host: "::",
      port: 8080,
    },

    // Use relative paths for Electron file:// protocol compatibility
    base,

    plugins: [
      react(),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Ensure assets use relative paths
      assetsDir: "assets",
      rollupOptions: {
        output: {
          // Ensure chunk names don't have problematic characters
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});
