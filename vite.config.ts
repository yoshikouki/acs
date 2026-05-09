import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "src/client",
  build: {
    emptyOutDir: true,
    outDir: "../../dist/client"
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/agent": "http://127.0.0.1:8787"
    }
  }
});

