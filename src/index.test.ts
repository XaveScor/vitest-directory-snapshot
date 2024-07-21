import { describe, expect } from "vitest";
import { resolve } from "node:path";
import { myTest } from "./myTest.js";

describe("toMatchDirSnapshot", () => {
  describe("fail", () => {
    myTest.fails("expected is not a string", () => {
      expect(undefined).toMatchDirSnapshot();
    });

    myTest.fails("expected is not a directory", () => {
      expect("invalid").toMatchDirSnapshot();
    });

    myTest.fails("relative path", () => {
      expect("./fixtures/invalid").toMatchDirSnapshot();
    });

    myTest.fails(".not supported", () => {
      expect("/").not.toMatchDirSnapshot();
    });
  });

  describe("pass", () => {
    myTest("empty directory", ({ tmpDir }) => {
      expect(tmpDir).toMatchDirSnapshot();
    });

    myTest("dir + text file", () => {
      const dir = resolve(import.meta.dirname, "fixtures", "text-file");
      expect(dir).toMatchDirSnapshot();
    });

    myTest("hierarchy", () => {
      const dir = resolve(import.meta.dirname, "fixtures", "hierarchy");
      expect(dir).toMatchDirSnapshot();
    });
  });
});
