import * as fs from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, isAbsolute, join } from "node:path";
import type { MatcherState } from "vitest";
import { compareDirectories } from "./compareDirectories.js";
import { copyDirectory } from "./copyDirectory.js";
import {
  assertNoSymlinkComponents,
  assertSafeDirectoryName,
} from "./pathSafety.js";

const MULTIPLE_INVOCATIONS_HINT_ERROR =
  "When toMatchDirSnapshot() is called multiple times in one test, all invocations must have a unique hint";

export interface DirectorySnapshotOptions {
  snapshotDirectoryName?: string;
}

export type DirectorySnapshotMatcher = (
  this: MatcherState,
  received: unknown,
  hint?: string,
) => DirectorySnapshotResult;

interface DirectorySnapshotResult {
  pass: boolean;
  message: () => string;
}

export function createToMatchDirSnapshot(
  options: DirectorySnapshotOptions = {},
): DirectorySnapshotMatcher {
  const invocationsByTest = new WeakMap<object, TestInvocations>();

  return function toMatchDirSnapshot(
    this: MatcherState,
    received: unknown,
    hint?: string,
  ): DirectorySnapshotResult {
    if (this.isNot) {
      return {
        pass: true,
        message: () => ".not.toMatchDirSnapshot() is not supported",
      };
    }

    if (!this.testPath || !this.currentTestName) {
      return {
        pass: false,
        message: () =>
          "toMatchDirSnapshot() must be called from a running test",
      };
    }

    if (typeof received !== "string") {
      return {
        pass: false,
        message: () =>
          `Expected an absolute directory path, received ${formatReceived(received)}`,
      };
    }

    if (!isAbsolute(received)) {
      return {
        pass: false,
        message: () =>
          `Expected an absolute directory path, received "${received}"`,
      };
    }

    if (
      hint !== undefined &&
      (typeof hint !== "string" || hint.trim() === "")
    ) {
      return {
        pass: false,
        message: () => "Directory snapshot hint must be a non-empty string",
      };
    }

    const invocationError = registerInvocation(
      invocationsByTest,
      this.task,
      hint,
    );
    if (invocationError) {
      return { pass: false, message: () => invocationError };
    }

    const receivedValidation = validateReceivedDirectory(received);
    if (receivedValidation) {
      return { pass: false, message: () => receivedValidation };
    }

    const snapshotDirectoryName =
      options.snapshotDirectoryName ??
      process.env.VITEST_DIR_SNAPSHOT_DIR ??
      "__dir_snapshots__";
    assertSafeDirectoryName(snapshotDirectoryName);

    const snapshotRoot = join(dirname(this.testPath), snapshotDirectoryName);
    const snapshotPath = join(
      snapshotRoot,
      createSnapshotName(
        this.task?.id ?? basename(this.testPath),
        this.currentTestName,
        hint,
      ),
    );
    assertNoSymlinkComponents(snapshotPath, dirname(this.testPath));

    const updateMode = this.snapshotState.snapshotUpdateState;
    const snapshotExists = fs.existsSync(snapshotPath);
    const shouldUpdate =
      updateMode === "all" || (updateMode === "new" && !snapshotExists);

    if (shouldUpdate) {
      try {
        copyDirectory(received, snapshotPath);
      } catch (error: unknown) {
        return {
          pass: false,
          message: () => formatError("Directory snapshot update failed", error),
        };
      }

      return {
        pass: true,
        message: () => `Directory snapshot written to "${snapshotPath}"`,
      };
    }

    try {
      compareDirectories(received, snapshotPath);
    } catch (error: unknown) {
      return {
        pass: false,
        message: () =>
          formatError("Directory snapshot comparison failed", error),
      };
    }

    return {
      pass: true,
      message: () =>
        `Expected directory not to match snapshot "${snapshotPath}"`,
    };
  };
}

interface TestInvocations {
  attempt: string;
  hints: Set<string>;
  hasUnhintedCall: boolean;
  invalid: boolean;
}

function registerInvocation(
  invocationsByTest: WeakMap<object, TestInvocations>,
  task: MatcherState["task"],
  hint: string | undefined,
): string | undefined {
  if (!task) {
    return undefined;
  }

  const attempt = `${task.result?.retryCount ?? 0}:${task.result?.repeatCount ?? 0}`;
  let invocations = invocationsByTest.get(task);
  if (!invocations || invocations.attempt !== attempt) {
    invocations = {
      attempt,
      hints: new Set<string>(),
      hasUnhintedCall: false,
      invalid: false,
    };
    invocationsByTest.set(task, invocations);
  }

  if (invocations.invalid) {
    return MULTIPLE_INVOCATIONS_HINT_ERROR;
  }

  if (hint === undefined) {
    if (invocations.hasUnhintedCall || invocations.hints.size > 0) {
      invocations.invalid = true;
      return MULTIPLE_INVOCATIONS_HINT_ERROR;
    }
    invocations.hasUnhintedCall = true;
    return undefined;
  }

  if (invocations.hasUnhintedCall) {
    invocations.invalid = true;
    return MULTIPLE_INVOCATIONS_HINT_ERROR;
  }

  if (invocations.hints.has(hint)) {
    invocations.invalid = true;
    return `Directory snapshot hint "${hint}" must be unique within the test`;
  }

  invocations.hints.add(hint);
  return undefined;
}

export const toMatchDirSnapshot = createToMatchDirSnapshot();

function createSnapshotName(
  testId: string,
  testName: string,
  hint?: string,
): string {
  const identity = [testId, hint ?? ""].join("\0");
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 16);
  const readableName = [testName, hint]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${readableName || "directory-snapshot"}-${hash}`;
}

function validateReceivedDirectory(path: string): string | undefined {
  try {
    const stats = fs.lstatSync(path);
    if (!stats.isDirectory()) {
      const type = stats.isFile()
        ? "file"
        : stats.isSymbolicLink()
          ? "symbolic link"
          : "special filesystem entry";
      return `Expected "${path}" to be a directory, but it is a ${type}`;
    }
  } catch (error: unknown) {
    if (isErrorWithCode(error) && error.code === "ENOENT") {
      return `Directory "${path}" does not exist`;
    }
    return formatError(`Failed to access directory "${path}"`, error);
  }

  return undefined;
}

function formatReceived(received: unknown): string {
  if (received === null) return "null";
  if (typeof received === "string") return `"${received}"`;
  if (typeof received === "bigint") return `${received}n`;
  if (typeof received === "symbol") return received.toString();

  try {
    return `${typeof received} (${JSON.stringify(received)})`;
  } catch {
    return typeof received;
  }
}

function formatError(prefix: string, error: unknown): string {
  return `${prefix}:\n\n${error instanceof Error ? error.message : String(error)}`;
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
