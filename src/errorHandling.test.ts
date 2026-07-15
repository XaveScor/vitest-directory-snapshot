import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareDirectories } from "./compareDirectories.js";
import { copyDirectory, EMPTY_DIRECTORY_MARKER } from "./copyDirectory.js";

describe("directory operations", () => {
  let testDirectory: string;
  let source: string;
  let snapshot: string;

  beforeEach(() => {
    testDirectory = fs.mkdtempSync(join(tmpdir(), "directory-snapshot-"));
    source = join(testDirectory, "source");
    snapshot = join(testDirectory, "snapshot");
    fs.mkdirSync(source);
  });

  afterEach(() => {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it("compares directory entries in both directions", () => {
    fs.writeFileSync(join(source, "expected.txt"), "content");
    copyDirectory(source, snapshot);
    fs.writeFileSync(join(snapshot, "stale.txt"), "stale");

    expect(() => compareDirectories(source, snapshot)).toThrow(
      'Extra in snapshot: "stale.txt"',
    );
  });

  it("reports entries missing from the snapshot", () => {
    fs.writeFileSync(join(source, "missing.txt"), "content");
    fs.mkdirSync(snapshot);

    expect(() => compareDirectories(source, snapshot)).toThrow(
      'Missing from snapshot: "missing.txt"',
    );
  });

  it("replaces snapshots and removes stale entries", () => {
    fs.writeFileSync(join(source, "current.txt"), "first");
    copyDirectory(source, snapshot);
    fs.writeFileSync(join(snapshot, "stale.txt"), "stale");
    fs.writeFileSync(join(source, "current.txt"), "second");

    copyDirectory(source, snapshot);

    expect(fs.existsSync(join(snapshot, "stale.txt"))).toBe(false);
    expect(fs.readFileSync(join(snapshot, "current.txt"), "utf8")).toBe(
      "second",
    );
    expect(() => compareDirectories(source, snapshot)).not.toThrow();
  });

  it("supports file-to-directory transitions during updates", () => {
    fs.writeFileSync(join(source, "entry"), "file");
    copyDirectory(source, snapshot);
    fs.rmSync(join(source, "entry"));
    fs.mkdirSync(join(source, "entry"));
    fs.writeFileSync(join(source, "entry", "nested.txt"), "nested");

    copyDirectory(source, snapshot);

    expect(fs.statSync(join(snapshot, "entry")).isDirectory()).toBe(true);
    expect(() => compareDirectories(source, snapshot)).not.toThrow();
  });

  it("preserves empty directories with a reserved marker", () => {
    fs.mkdirSync(join(source, "empty"));
    copyDirectory(source, snapshot);

    expect(fs.existsSync(join(snapshot, "empty", EMPTY_DIRECTORY_MARKER))).toBe(
      true,
    );
    expect(() => compareDirectories(source, snapshot)).not.toThrow();
  });

  it("rejects malformed empty-directory markers", () => {
    fs.mkdirSync(snapshot);
    fs.mkdirSync(join(snapshot, EMPTY_DIRECTORY_MARKER));

    expect(() => compareDirectories(source, snapshot)).toThrow(
      "expected an empty regular file",
    );
  });

  it("rejects non-empty empty-directory markers", () => {
    fs.mkdirSync(snapshot);
    fs.writeFileSync(join(snapshot, EMPTY_DIRECTORY_MARKER), "not empty");

    expect(() => compareDirectories(source, snapshot)).toThrow(
      "expected an empty regular file",
    );
  });

  it("rejects overlapping source and snapshot paths", () => {
    expect(() => copyDirectory(source, join(source, "snapshot"))).toThrow(
      "must not overlap",
    );
  });

  it.skipIf(process.platform === "win32")(
    "rejects source symbolic links",
    () => {
      fs.writeFileSync(join(testDirectory, "outside.txt"), "outside");
      fs.symlinkSync(
        join(testDirectory, "outside.txt"),
        join(source, "link.txt"),
      );

      expect(() => copyDirectory(source, snapshot)).toThrow(
        "Symbolic links are not supported",
      );
    },
  );

  it.skipIf(process.platform === "win32")(
    "keeps the previous snapshot when creating its replacement fails",
    () => {
      fs.writeFileSync(join(source, "current.txt"), "current");
      copyDirectory(source, snapshot);
      fs.symlinkSync(
        join(testDirectory, "outside.txt"),
        join(source, "link.txt"),
      );

      expect(() => copyDirectory(source, snapshot)).toThrow(
        "Symbolic links are not supported",
      );
      expect(fs.readFileSync(join(snapshot, "current.txt"), "utf8")).toBe(
        "current",
      );
    },
  );

  it.skipIf(process.platform === "win32")(
    "rejects a symbolic-link snapshot destination",
    () => {
      const outside = join(testDirectory, "outside");
      fs.mkdirSync(outside);
      fs.symlinkSync(outside, snapshot);

      expect(() => copyDirectory(source, snapshot)).toThrow(
        "must not be a symbolic link",
      );
    },
  );

  it("compares different invalid UTF-8 files by bytes", () => {
    fs.writeFileSync(join(source, "data.bin"), Buffer.from([0x80]));
    fs.mkdirSync(snapshot);
    fs.writeFileSync(join(snapshot, "data.bin"), Buffer.from([0x81]));

    expect(() => compareDirectories(source, snapshot)).toThrow(
      "Binary files differ",
    );
  });
});
