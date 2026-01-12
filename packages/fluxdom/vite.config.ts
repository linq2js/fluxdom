/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react/index.ts"),
        immer: resolve(__dirname, "src/immer/index.ts"),
      },
      name: "FluxDom",
    },
    rollupOptions: {
      external: ["react", "react-dom", "immer"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          immer: "immer",
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
