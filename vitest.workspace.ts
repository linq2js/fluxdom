import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // fluxdom package with happy-dom for React testing
  {
    test: {
      name: "fluxdom",
      root: "./packages/fluxdom",
      environment: "happy-dom",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  },
]);
