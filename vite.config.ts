import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON === "true";

  return {
    server: {
      host: "::",
      port: 8080,
    },

    // Electron requires relative paths
    base: isElectron ? "./" : "/",

    plugins: [
      react(),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      // ensures clean rel
    },
  };
});
