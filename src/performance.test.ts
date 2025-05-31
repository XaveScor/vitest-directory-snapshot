import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { compareDirectories } from "./compareDirectories.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

describe("performance", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.promises.mkdtemp(join(tmpdir(), "perf-test-"));
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it("should handle large directory structures efficiently", async () => {
    const srcDir = resolve(fixturesDir, "large-directory");
    const destDir = join(testDir, "dest");
    
    // Copy the fixture to create identical destination
    await fs.promises.cp(srcDir, destDir, { recursive: true });
    
    // This should complete quickly with optimized lookup
    const compareStart = Date.now();
    expect(() => compareDirectories(srcDir, destDir)).not.toThrow();
    const compareTime = Date.now() - compareStart;
    
    // Should take less than 1 second for 100 files
    expect(compareTime).toBeLessThan(1000);
  });

  it("should handle binary files efficiently", async () => {
    const srcDir = join(testDir, "src");
    const destDir = join(testDir, "dest");
    
    fs.mkdirSync(srcDir);
    fs.mkdirSync(destDir);
    
    // Copy binary fixture files
    const srcFile = join(srcDir, "binary.bin");
    const destFile = join(destDir, "binary.bin");
    const fixtureFile = resolve(fixturesDir, "binary-files/image.bin");
    
    await fs.promises.copyFile(fixtureFile, srcFile);
    await fs.promises.copyFile(fixtureFile, destFile);
    
    // This should use hash comparison instead of content diff
    const startTime = Date.now();
    expect(() => compareDirectories(srcDir, destDir)).not.toThrow();
    const compareTime = Date.now() - startTime;
    
    // Should be very fast with hash comparison
    expect(compareTime).toBeLessThan(100);
  });

  it("should detect binary file differences quickly", async () => {
    const srcDir = join(testDir, "src");
    const destDir = join(testDir, "dest");
    
    fs.mkdirSync(srcDir);
    fs.mkdirSync(destDir);
    
    // Copy different binary fixture files
    const srcFile = join(srcDir, "binary.bin");
    const destFile = join(destDir, "binary.bin");
    
    await fs.promises.copyFile(resolve(fixturesDir, "binary-files/image.bin"), srcFile);
    await fs.promises.copyFile(resolve(fixturesDir, "binary-files/different.bin"), destFile);
    
    const startTime = Date.now();
    expect(() => compareDirectories(srcDir, destDir)).toThrow("Binary files differ");
    const compareTime = Date.now() - startTime;
    
    // Should fail fast with hash comparison
    expect(compareTime).toBeLessThan(100);
  });

  it("should provide detailed diffs for small text files", () => {
    const srcDir = resolve(fixturesDir, "directories/file-content-diff");
    const destDir = resolve(fixturesDir, "directories/file-content-diff-dest");
    
    // Should provide detailed diff for small text files
    expect(() => compareDirectories(srcDir, destDir)).toThrow("File content differs:");
    expect(() => compareDirectories(srcDir, destDir)).toThrow("Content differs between files:");
  });
});