import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

describe("toMatchDirSnapshot", () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(join(tmpdir(), "matcher-test-"));
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test("rejects non-string values", () => {
    expect(() => expect(123).toMatchDirSnapshot()).toThrow(
      "Expected an absolute directory path",
    );
  });

  test("rejects relative paths", () => {
    expect(() => expect("./relative").toMatchDirSnapshot()).toThrow(
      "Expected an absolute directory path",
    );
  });

  test("rejects missing directories", () => {
    expect(() =>
      expect(resolve("definitely-does-not-exist")).toMatchDirSnapshot(),
    ).toThrow("does not exist");
  });

  test("rejects .not", () => {
    expect(() => expect(temporaryDirectory).not.toMatchDirSnapshot()).toThrow(
      ".not.toMatchDirSnapshot() is not supported",
    );
  });

  test("matches an empty directory", () => {
    expect(temporaryDirectory).toMatchDirSnapshot();
  });

  test("matches text files", () => {
    const directory = resolve(import.meta.dirname, "fixtures", "text-file");
    expect(directory).toMatchDirSnapshot();
  });

  test("matches directory hierarchies", () => {
    const directory = resolve(import.meta.dirname, "fixtures", "hierarchy");
    expect(directory).toMatchDirSnapshot();
  });

  test("supports multiple named snapshots in one test", () => {
    const directory = resolve(import.meta.dirname, "fixtures", "text-file");
    expect(directory).toMatchDirSnapshot("first");
    expect(directory).toMatchDirSnapshot("second");
  });

  test("requires all invocations to have hints when used multiple times", () => {
    expect(temporaryDirectory).toMatchDirSnapshot();
    expect(() =>
      expect(temporaryDirectory).toMatchDirSnapshot("second"),
    ).toThrow("all invocations must have a unique hint");
  });

  test("requires hints to be unique within a test", () => {
    expect(temporaryDirectory).toMatchDirSnapshot("output");
    expect(() =>
      expect(temporaryDirectory).toMatchDirSnapshot("output"),
    ).toThrow('hint "output" must be unique within the test');
  });
});
