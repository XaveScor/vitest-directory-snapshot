import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./src/index.ts"],
    typecheck: {
      enabled: true,
    },
  }
});
