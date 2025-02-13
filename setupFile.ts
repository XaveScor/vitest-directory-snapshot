import { expect } from "vitest";
import { createToMatchDirSnapshot } from "./src/toMatchDirSnapshot.js";

expect.extend({
  toMatchDirSnapshot: createToMatchDirSnapshot(),
});
