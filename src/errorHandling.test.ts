import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { compareDirectories } from "./compareDirectories.js";
import { copyDirectory } from "./copyDirectory.js";
import { myTest } from "./myTest.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

describe("error handling", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.promises.mkdtemp(join(tmpdir(), "error-test-"));
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe("compareDirectories", () => {
    it("should provide detailed error when source directory doesn't exist", () => {
      const nonExistentPath = join(testDir, "nonexistent");
      const destPath = join(testDir, "dest");
      fs.mkdirSync(destPath);

      expect(() => compareDirectories(nonExistentPath, destPath)).toThrow(
        'Source directory'
      );
      expect(() => compareDirectories(nonExistentPath, destPath)).toThrow(
        'does not exist'
      );
    });

    it("should provide detailed error when snapshot directory doesn't exist", () => {
      const srcPath = join(testDir, "src");
      const nonExistentDest = join(testDir, "nonexistent");
      fs.mkdirSync(srcPath);

      expect(() => compareDirectories(srcPath, nonExistentDest)).toThrow(
        'Snapshot directory'
      );
      expect(() => compareDirectories(srcPath, nonExistentDest)).toThrow(
        'does not exist. Run tests with --update-snapshots to create it'
      );
    });

    it("should detect type mismatches", () => {
      const srcPath = resolve(fixturesDir, "directories/src-type-mismatch");
      const destPath = resolve(fixturesDir, "directories/dest-type-mismatch");

      expect(() => compareDirectories(srcPath, destPath)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Type mismatch: "item" is a file in source but a directory in snapshot]`
      );
    });

    it("should show available files when file is missing from snapshot", () => {
      const srcPath = resolve(fixturesDir, "directories/src");
      const destPath = resolve(fixturesDir, "directories/dest-missing-file");

      expect(() => compareDirectories(srcPath, destPath)).toThrowErrorMatchingInlineSnapshot(
        `[Error: File/directory "missing.txt" exists in source but not in snapshot. Available in snapshot: existing1.txt, existing2.txt. Run tests with --update-snapshots to update.]`
      );
    });

    it("should provide detailed diff when file contents differ", () => {
      const srcPath = resolve(fixturesDir, "directories/file-content-diff");
      const destPath = resolve(fixturesDir, "directories/file-content-diff-dest");

      expect(() => compareDirectories(srcPath, destPath)).toThrow(
        'File content differs:'
      );
      expect(() => compareDirectories(srcPath, destPath)).toThrow(
        'Content differs between files:'
      );
      expect(() => compareDirectories(srcPath, destPath)).toThrow(
        '-   2: line2'
      );
      expect(() => compareDirectories(srcPath, destPath)).toThrow(
        '+   2: modified'
      );
    });
  });

  describe("copyDirectory", () => {
    it("should provide detailed error when source doesn't exist", () => {
      const nonExistentPath = join(testDir, "nonexistent");
      const destPath = join(testDir, "dest");

      expect(() => copyDirectory(nonExistentPath, destPath)).toThrow(
        'Source directory'
      );
      expect(() => copyDirectory(nonExistentPath, destPath)).toThrow(
        'does not exist'
      );
    });
  });

  describe("toMatchDirSnapshot error messages", () => {
    myTest("should provide helpful error for non-string input", () => {
      expect(() => expect(123).toMatchDirSnapshot()).toThrowErrorMatchingInlineSnapshot(
        `[Error: Expected received value to be a string path, but got number (value: 123)]`
      );
    });

    myTest("should provide helpful error for relative paths", () => {
      expect(() => expect("./relative").toMatchDirSnapshot()).toThrowErrorMatchingInlineSnapshot(
        `[Error: Expected path to be absolute, but received relative path: "./relative". Use an absolute path like "/full/path/to/directory"]`
      );
    });

    myTest("should provide helpful error for non-existent paths", () => {
      expect(() => expect("/nonexistent/path").toMatchDirSnapshot()).toThrowErrorMatchingInlineSnapshot(
        `[Error: Directory "/nonexistent/path" does not exist. Check the path and ensure the directory exists before running the test.]`
      );
    });

    myTest("should provide helpful error when path is a file", ({ tmpDir }) => {
      const filePath = join(tmpDir, "file.txt");
      fs.writeFileSync(filePath, "content");

      expect(() => expect(filePath).toMatchDirSnapshot()).toThrow(
        `Expected "${filePath}" to be a directory, but it's a file`
      );
    });
  });
});