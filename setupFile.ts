import { expect } from "vitest";
import { toMatchDirSnapshot } from "./src/index.js";

expect.extend({
  toMatchDirSnapshot,
});
