/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react/index.ts"),
        devtools: resolve(__dirname, "src/devtools/index.ts"),
        "react-devtools": resolve(__dirname, "src/react-devtools/index.ts"),
      },
      name: "FluxDom",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
