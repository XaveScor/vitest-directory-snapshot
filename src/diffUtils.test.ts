import { describe, expect, it } from "vitest";
import { createContentDiff } from "./diffUtils.js";

describe("createContentDiff", () => {
  it("renders changed text with context", () => {
    const diff = createContentDiff(
      "line1\nline2\nline3",
      "line1\nchanged\nline3",
      "actual.txt",
      "expected.txt",
    );

    expect(diff).toContain("-   2: line2");
    expect(diff).toContain("+   2: changed");
    expect(diff).toContain("Lines in actual: 3, Lines in expected: 3");
  });

  it("distinguishes missing lines from empty lines", () => {
    const diff = createContentDiff(
      "content",
      "content\n",
      "actual",
      "expected",
    );
    expect(diff).toContain("-   2: <missing line>");
    expect(diff).toContain("+   2: ");
  });

  it("omits unchanged regions between distant differences", () => {
    const actual = Array.from({ length: 100 }, (_, index) => `line ${index}`);
    const expected = [...actual];
    expected[2] = "first change";
    expected[97] = "second change";

    const diff = createContentDiff(
      actual.join("\n"),
      expected.join("\n"),
      "actual",
      "expected",
    );

    expect(diff).toContain("lines omitted");
    expect(diff.split("\n").length).toBeLessThan(30);
  });
});
