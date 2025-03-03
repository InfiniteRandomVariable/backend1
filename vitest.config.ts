// backend/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/*.test.*ts"], // Adjust to your test file location
  },
});
