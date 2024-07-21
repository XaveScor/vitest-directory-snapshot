import * as fs from "node:fs";
import { isAbsolute, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { expect } from "vitest";

const snapshotDirName = "__dir_snapshots__";

expect.extend({
  toMatchDirSnapshot: function (received: unknown) {
    const { snapshotState, isNot, testPath, currentTestName } =
      expect.getState();

    if (!testPath) {
      return {
        pass: false,
        message: () => `testPath is not defined`,
      };
    }

    if (!currentTestName) {
      return {
        pass: false,
        message: () => `currentTestName is not defined`,
      };
    }

    if (isNot) {
      return {
        // true because we don't support .not
        pass: true,
        message: () => `.not for toMatchDirSnapshot is not supported`,
      };
    }

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

    let lstats: fs.Stats;
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

    const directorySnapshotPath = createHash("sha256")
      .update(`${testPath}/${currentTestName}`)
      .digest("hex");

    // @ts-expect-error we NEED this field
    const isUpdate = snapshotState._updateSnapshot === "all";

    if (isUpdate) {
      const snapshotPath = join(
        dirname(testPath),
        snapshotDirName,
        directorySnapshotPath,
      );
      fs.mkdirSync(snapshotPath, { recursive: true });
      const receiverDir = fs.readdirSync(received);
      for (const file of receiverDir) {
        const filePath = join(received, file);
        fs.copyFileSync(filePath, join(snapshotPath, file));
      }

      return {
        pass: true,
        message: () => `snapshot created`,
      };
    }

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
