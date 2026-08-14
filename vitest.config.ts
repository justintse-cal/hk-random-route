import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "scripts/**/*.test.ts",
      "app/api/**/*.test.ts",
      "app/components/**/*.test.ts",
      "app/*.test.tsx",
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
