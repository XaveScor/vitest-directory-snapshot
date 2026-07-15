import { expect } from "vitest";
import { toMatchDirSnapshot } from "./toMatchDirSnapshot.js";
import "./types.js";

expect.extend({ toMatchDirSnapshot });
