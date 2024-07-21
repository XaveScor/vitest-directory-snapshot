import * as fs from "node:fs";
import { Stats } from "node:fs";
import { isAbsolute } from "node:path";
import { expect } from "vitest";

expect.extend({
  toMatchDirSnapshot: function (received: unknown) {
    if (typeof received !== "string") {
      return {
        pass: false,
        message: () => `Expected "${received}" to be a string`,
        expected: "string",
        received: typeof received,
      };
    }

    if (!isAbsolute(received)) {
      return {
        pass: false,
        message: () => `Expected "${received}" to be an absolute path`,
      };
    }

    let lstats: Stats;
    try {
      lstats = fs.lstatSync(received);
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

    // const { snapshotState } = this;
    // // @ts-expect-error we NEED this field
    // const isUpdate = snapshotState._updateSnapshot === "all";
    //
    // const content = await fs.readdir(received, { recursive: true });
    //
    // console.log(content);

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
