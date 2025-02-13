import { expect } from "vitest";
import { dirname, isAbsolute, join, relative } from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { copyDirectory } from "./copyDirectory.js";
import { compareDirectories } from "./compareDirectories.js";

export function createToMatchDirSnapshot(
  options: { snapshotDirName?: string } = {},
) {
  return function toMatchDirSnapshot(received: unknown) {
    const { snapshotState, isNot, testPath, currentTestName } =
      expect.getState();

    if (isNot) {
      return {
        // true because we don't support .not
        pass: true,
        message: () => `.not for toMatchDirSnapshot is not supported`,
      };
    }

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

    const localTestPath = relative(process.cwd(), testPath);
    const safeCurrentTestName = currentTestName.replace(/\W+/g, "-");
    const testDirName =
      safeCurrentTestName +
      "-" +
      createHash("sha256")
        .update(join(localTestPath, currentTestName))
        .digest("hex")
        .slice(0, 8);

    // @ts-expect-error we NEED this field
    const isUpdate = snapshotState._updateSnapshot === "all";

    const snapshotDirName =
      options.snapshotDirName ||
      process.env.VITEST_DIR_SNAPSHOT_DIR ||
      "__dir_snapshots__";
    const snapshotPath = join(dirname(testPath), snapshotDirName, testDirName);

    if (isUpdate) {
      copyDirectory(received, snapshotPath);

      return {
        pass: true,
        message: () => `snapshot created`,
      };
    }

    try {
      compareDirectories(received, snapshotPath);
    } catch (error) {
      return {
        pass: false,
        // @ts-expect-error
        message: () => error.message,
      };
    }

    return {
      pass: true,
      message: () => `ok`,
    };
  };
}
