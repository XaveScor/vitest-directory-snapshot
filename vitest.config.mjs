import { defineViteConfig } from "smartbundle";
import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig(async () => {
  const viteConfig = await defineViteConfig();

  return mergeConfig(
    viteConfig,
    defineConfig({
      test: {
        globals: true,
        setupFiles: ["./setupFile.ts"],
        typecheck: {
          enabled: true,
        },
      },
    }),
  );
});
