import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MatcherState } from "vitest";
import { createToMatchDirSnapshot } from "./toMatchDirSnapshot.js";

describe("directory snapshot matcher", () => {
  let root: string;
  let source: string;

  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), "matcher-contract-"));
    source = join(root, "output");
    fs.mkdirSync(source);
    fs.writeFileSync(join(source, "file.txt"), "content");
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates missing snapshots in new mode and compares them in none mode", () => {
    const matcher = createToMatchDirSnapshot();
    const context = createContext(root, "new");

    expect(matcher.call(context, source)).toMatchObject({ pass: true });
    expect(matcher.call(createContext(root, "none"), source)).toMatchObject({
      pass: true,
    });
  });

  it("replaces existing snapshots in all mode", () => {
    const matcher = createToMatchDirSnapshot();

    expect(matcher.call(createContext(root, "all"), source)).toMatchObject({
      pass: true,
    });
    fs.writeFileSync(join(source, "file.txt"), "updated");
    expect(matcher.call(createContext(root, "all"), source)).toMatchObject({
      pass: true,
    });
    expect(matcher.call(createContext(root, "none"), source)).toMatchObject({
      pass: true,
    });
  });

  it("uses a safe custom snapshot directory name", () => {
    const matcher = createToMatchDirSnapshot({
      snapshotDirectoryName: "__custom__",
    });

    expect(matcher.call(createContext(root, "all"), source)).toMatchObject({
      pass: true,
    });
    expect(fs.readdirSync(join(root, "__custom__"))).toHaveLength(1);
  });

  it("rejects an unhinted call followed by another snapshot", () => {
    const matcher = createToMatchDirSnapshot();
    const context = createContext(root, "all");

    expect(matcher.call(context, source)).toMatchObject({ pass: true });
    const secondResult = matcher.call(context, source, "second");
    expect(secondResult.pass).toBe(false);
    expect(secondResult.message()).toContain(
      "all invocations must have a unique hint",
    );
  });

  it("rejects an unhinted call after a hinted snapshot", () => {
    const matcher = createToMatchDirSnapshot();
    const context = createContext(root, "all");

    expect(matcher.call(context, source, "first")).toMatchObject({
      pass: true,
    });
    const secondResult = matcher.call(context, source);
    expect(secondResult.pass).toBe(false);
    expect(secondResult.message()).toContain(
      "all invocations must have a unique hint",
    );
  });

  it("requires hints to be unique within a test", () => {
    const matcher = createToMatchDirSnapshot();
    const context = createContext(root, "all");

    expect(matcher.call(context, source, "output")).toMatchObject({
      pass: true,
    });
    const secondResult = matcher.call(context, source, "output");
    expect(secondResult.pass).toBe(false);
    expect(secondResult.message()).toContain("must be unique within the test");
  });

  it("accepts multiple unique hints within a test", () => {
    const matcher = createToMatchDirSnapshot();
    const context = createContext(root, "all");

    expect(matcher.call(context, source, "first")).toMatchObject({
      pass: true,
    });
    expect(matcher.call(context, source, "second")).toMatchObject({
      pass: true,
    });
  });

  it("rejects snapshot directory traversal", () => {
    const matcher = createToMatchDirSnapshot({
      snapshotDirectoryName: "../outside",
    });

    expect(() => matcher.call(createContext(root, "all"), source)).toThrow(
      "single non-empty path component",
    );
  });

  it.skipIf(process.platform === "win32")(
    "rejects a symbolic-link snapshot root",
    () => {
      const outside = join(root, "outside");
      fs.mkdirSync(outside);
      fs.symlinkSync(outside, join(root, "__dir_snapshots__"));

      expect(() =>
        createToMatchDirSnapshot().call(createContext(root, "all"), source),
      ).toThrow("Symbolic links are not allowed in snapshot paths");
    },
  );
});

function createContext(
  root: string,
  snapshotUpdateState: "all" | "new" | "none",
): MatcherState {
  return {
    currentTestName: "matcher contract",
    isNot: false,
    snapshotState: { snapshotUpdateState },
    task: { id: "matcher-contract" },
    testPath: join(root, "matcher.test.ts"),
  } as unknown as MatcherState;
}
