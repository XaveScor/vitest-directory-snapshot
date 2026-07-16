import type {} from "vitest";

declare module "vitest" {
  interface Matchers<T = any> {
    toMatchDirSnapshot(hint?: string): void;
  }
}
