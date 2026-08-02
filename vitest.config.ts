import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
