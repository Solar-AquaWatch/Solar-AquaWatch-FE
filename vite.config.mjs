import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
  preview: {
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
