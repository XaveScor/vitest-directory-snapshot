import { describe, expect } from "vitest";
import { myTest } from "./myTest.js";

describe("toMatchDirSnapshot", () => {
  describe("fail", () => {
    myTest("expected is not a string", () => {
      expect(undefined).not.toMatchDirSnapshot();
    });

    myTest("expected is not a directory", () => {
      expect("invalid").not.toMatchDirSnapshot();
    });

    myTest("relative path", () => {
      expect("./fixtures/invalid").not.toMatchDirSnapshot();
    });
  });

  describe("pass", () => {
    myTest("empty directory", ({ tmpDir }) => {
      expect(tmpDir).toMatchDirSnapshot();
    });

    // myTest("dir + text file", () => {
    //   expect("./fixtures/text-file").toMatchDirSnapshot();
    // });
  });
});
