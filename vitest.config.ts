import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/mcp-server/tests/**/*.test.ts"]
  }
});

