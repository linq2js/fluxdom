import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    coverage: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.{ts,tsx}",
        "**/index.ts", // Exclude barrel files
        "**/types.ts", // Exclude type-only files
      ],
    },
  },
});
