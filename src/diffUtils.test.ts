import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import * as fs from "node:fs";
import { createContentDiff } from "./diffUtils.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

describe("diffUtils", () => {
  describe("createContentDiff", () => {
    it("should create diff for different content", () => {
      const actualPath = resolve(fixturesDir, "text-files/simple.txt");
      const expectedPath = resolve(fixturesDir, "text-files/simple-modified.txt");
      
      const actual = fs.readFileSync(actualPath, "utf8");
      const expected = fs.readFileSync(expectedPath, "utf8");

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   ${actualPath}
          Expected: ${expectedPath}

            1: Hello world
        -   2: This is a simple text file
        +   2: This is a modified text file
            3: Line 3

        Lines in actual: 3, Lines in expected: 3"
      `);
    });

    it("should handle files with different line counts", () => {
      const actualPath = resolve(fixturesDir, "text-files/line-count-short.txt");
      const expectedPath = resolve(fixturesDir, "text-files/line-count-long.txt");
      
      const actual = fs.readFileSync(actualPath, "utf8");
      const expected = fs.readFileSync(expectedPath, "utf8");

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   ${actualPath}
          Expected: ${expectedPath}

            1: line1
            2: line2
        +   3: line3
        -   3: <missing line>
        +   4: line4
        -   4: <missing line>

        Lines in actual: 2, Lines in expected: 4"
      `);
    });

    it("should show context around differences", () => {
      const actualPath = resolve(fixturesDir, "text-files/multiline-diff.txt");
      const expectedPath = resolve(fixturesDir, "text-files/multiline-diff-modified.txt");
      
      const actual = fs.readFileSync(actualPath, "utf8");
      const expected = fs.readFileSync(expectedPath, "utf8");

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   ${actualPath}
          Expected: ${expectedPath}

            1: line1
            2: line2
            3: line3
        -   4: line4
        +   4: modified
            5: line5
            6: line6
            7: line7

        Lines in actual: 7, Lines in expected: 7"
      `);
    });

    it("should handle missing lines", () => {
      const actualPath = resolve(fixturesDir, "text-files/missing-lines.txt");
      const expectedPath = resolve(fixturesDir, "text-files/missing-lines-complete.txt");
      
      const actual = fs.readFileSync(actualPath, "utf8");
      const expected = fs.readFileSync(expectedPath, "utf8");

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   ${actualPath}
          Expected: ${expectedPath}

            1: line1
        -   2: line3
        +   2: line2
        +   3: line3
        -   3: <missing line>

        Lines in actual: 2, Lines in expected: 3"
      `);
    });

    it("should handle empty files", () => {
      const actualPath = resolve(fixturesDir, "text-files/empty.txt");
      const expectedPath = resolve(fixturesDir, "text-files/single-line.txt");
      
      const actual = fs.readFileSync(actualPath, "utf8");
      const expected = fs.readFileSync(expectedPath, "utf8");

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   ${actualPath}
          Expected: ${expectedPath}

        +   1: content
        -   1: <missing line>

        Lines in actual: 1, Lines in expected: 1"
      `);
    });
  });
});
