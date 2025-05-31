import { describe, expect, it } from "vitest";
import { createContentDiff } from "./diffUtils.js";

describe("diffUtils", () => {
  describe("createContentDiff", () => {
    it("should create diff for different content", () => {
      const actual = "line1\nline2\nline3";
      const expected = "line1\nmodified line2\nline3";
      const actualPath = "/path/to/actual.txt";
      const expectedPath = "/path/to/expected.txt";

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   /path/to/actual.txt
          Expected: /path/to/expected.txt

            1: line1
        -   2: line2
        +   2: modified line2
            3: line3

        Lines in actual: 3, Lines in expected: 3"
      `);
    });

    it("should handle files with different line counts", () => {
      const actual = "line1\nline2";
      const expected = "line1\nline2\nline3\nline4";
      const actualPath = "/actual.txt";
      const expectedPath = "/expected.txt";

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   /actual.txt
          Expected: /expected.txt

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
      const actual = "line1\nline2\nline3\nline4\nline5\nline6\nline7";
      const expected = "line1\nline2\nline3\nmodified\nline5\nline6\nline7";
      const actualPath = "/actual.txt";
      const expectedPath = "/expected.txt";

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   /actual.txt
          Expected: /expected.txt

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
      const actual = "line1\nline3";
      const expected = "line1\nline2\nline3";
      const actualPath = "/actual.txt";
      const expectedPath = "/expected.txt";

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   /actual.txt
          Expected: /expected.txt

            1: line1
        -   2: line3
        +   2: line2
        +   3: line3
        -   3: <missing line>

        Lines in actual: 2, Lines in expected: 3"
      `);
    });

    it("should handle empty files", () => {
      const actual = "";
      const expected = "content";
      const actualPath = "/actual.txt";
      const expectedPath = "/expected.txt";

      const diff = createContentDiff(
        actual,
        expected,
        actualPath,
        expectedPath,
      );

      expect(diff).toMatchInlineSnapshot(`
        "Content differs between files:
          Actual:   /actual.txt
          Expected: /expected.txt

        +   1: content
        -   1: <missing line>

        Lines in actual: 1, Lines in expected: 1"
      `);
    });
  });
});
