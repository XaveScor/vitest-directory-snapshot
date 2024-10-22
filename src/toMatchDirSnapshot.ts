import { expect } from "vitest";
import { dirname, isAbsolute, join } from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { copyDirectory } from "./copyDirectory.js";
import { compareDirectories } from "./compareDirectories.js";

const snapshotDirName = "__dir_snapshots__";

export function toMatchDirSnapshot(received: unknown) {
  const { snapshotState, isNot, testPath, currentTestName } = expect.getState();

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

  const testDirName = createHash("sha256")
    .update(`${testPath}/${currentTestName}`)
    .digest("hex");

  // @ts-expect-error we NEED this field
  const isUpdate = snapshotState._updateSnapshot === "all";

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
}
