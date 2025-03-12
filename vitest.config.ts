// backend/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/*.test.*ts", "src/test/api_e2e/*.test.*ts"], // Adjust to your test file location
  },
});
