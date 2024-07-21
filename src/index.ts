import * as fs from "node:fs/promises";
import { Stats } from "node:fs";
import { expect } from "vitest";

expect.extend({
  toMatchDirSnapshot: async function (received: unknown) {
    if (typeof received !== "string") {
      return {
        pass: false,
        message: () => `Expected "${received}" to be a string`,
        expected: "string",
        received: typeof received,
      };
    }

    let lstats: Stats;
    try {
      lstats = await fs.lstat(received);
    } catch (error) {
      return {
        pass: false,
        message: () => `Expected "${received}" to be a directory`,
      };
    }

    if (!lstats.isDirectory()) {
      return {
        pass: false,
        message: () => `Expected "${received}" to be a directory`,
        expected: received,
      };
    }

    const { snapshotState } = this;
    // @ts-expect-error we NEED this field
    const isUpdate = snapshotState._updateSnapshot === "all";

    const content = await fs.readdir(received, { recursive: true });

    console.log(content);

    return {
      pass: true,
      message: () => `ok`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  toMatchDirSnapshot: () => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
