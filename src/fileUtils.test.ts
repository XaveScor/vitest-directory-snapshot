import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { isBinaryFile, getFileHashSync, shouldUseStreaming, compareFilesEfficiently, getFileStats } from "./fileUtils.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

describe("fileUtils", () => {

  describe("isBinaryFile", () => {
    it("should detect text files as non-binary", () => {
      const textFile = resolve(fixturesDir, "text-files/simple.txt");
      expect(isBinaryFile(textFile)).toBe(false);
    });

    it("should detect binary files", () => {
      const binaryFile = resolve(fixturesDir, "binary-files/image.bin");
      expect(isBinaryFile(binaryFile)).toBe(true);
    });

    it("should handle non-existent files", () => {
      expect(isBinaryFile(resolve(fixturesDir, "nonexistent.txt"))).toBe(true);
    });
  });

  describe("getFileHashSync", () => {
    it("should generate consistent hashes for same content", () => {
      const file1 = resolve(fixturesDir, "text-files/simple.txt");
      const file2 = resolve(fixturesDir, "text-files/identical.txt");
      
      const hash1 = getFileHashSync(file1);
      const hash2 = getFileHashSync(file2);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64-char hex string
    });

    it("should generate different hashes for different content", () => {
      const file1 = resolve(fixturesDir, "text-files/simple.txt");
      const file2 = resolve(fixturesDir, "text-files/simple-modified.txt");
      
      const hash1 = getFileHashSync(file1);
      const hash2 = getFileHashSync(file2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("shouldUseStreaming", () => {
    it("should not recommend streaming for small files", () => {
      const smallFile = resolve(fixturesDir, "text-files/simple.txt");
      expect(shouldUseStreaming(smallFile)).toBe(false);
    });

    it("should handle non-existent files", () => {
      expect(shouldUseStreaming(resolve(fixturesDir, "nonexistent.txt"))).toBe(false);
    });
  });

  describe("compareFilesEfficiently", () => {
    it("should indicate detailed diff needed for identical text files", () => {
      const file1 = resolve(fixturesDir, "text-files/simple.txt");
      const file2 = resolve(fixturesDir, "text-files/identical.txt");
      
      const result = compareFilesEfficiently(file1, file2);
      expect(result.needsDetailedDiff).toBe(true);
    });

    it("should pass for identical binary files", () => {
      const file1 = resolve(fixturesDir, "binary-files/image.bin");
      const file2 = resolve(fixturesDir, "binary-files/identical.bin");
      
      const result = compareFilesEfficiently(file1, file2);
      expect(result.needsDetailedDiff).toBe(false);
    });

    it("should throw for different binary files", () => {
      const file1 = resolve(fixturesDir, "binary-files/image.bin");
      const file2 = resolve(fixturesDir, "binary-files/different.bin");
      
      expect(() => compareFilesEfficiently(file1, file2)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Binary files differ: "${file1}" and "${file2}" have different content]`
      );
    });

    it("should throw for binary vs text mismatch", () => {
      const textFile = resolve(fixturesDir, "text-files/simple.txt");
      const binaryFile = resolve(fixturesDir, "binary-files/image.bin");
      
      expect(() => compareFilesEfficiently(textFile, binaryFile)).toThrowErrorMatchingInlineSnapshot(
        `[Error: File type mismatch: "${textFile}" is text but "${binaryFile}" is binary]`
      );
    });
  });

  describe("getFileStats", () => {
    it("should return correct stats for text file", () => {
      const textFile = resolve(fixturesDir, "text-files/simple.txt");
      
      const stats = getFileStats(textFile);
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.isBinary).toBe(false);
      expect(stats.shouldStream).toBe(false);
    });

    it("should return correct stats for binary file", () => {
      const binaryFile = resolve(fixturesDir, "binary-files/image.bin");
      
      const stats = getFileStats(binaryFile);
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.isBinary).toBe(true);
      expect(stats.shouldStream).toBe(false);
    });

    it("should throw for non-existent files", () => {
      expect(() => getFileStats(resolve(fixturesDir, "nonexistent.txt"))).toThrow(
        'Failed to get file stats'
      );
    });
  });
});