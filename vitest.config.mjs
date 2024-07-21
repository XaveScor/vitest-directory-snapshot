import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./setupFile.ts"],
    typecheck: {
      enabled: true,
    },
  },
});
