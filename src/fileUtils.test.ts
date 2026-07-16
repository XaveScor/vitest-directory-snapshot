import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { compareFilesEfficiently } from "./fileUtils.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("file utilities", () => {
  it("returns without requesting a diff for equal files", () => {
    const first = resolve(fixturesDir, "text-files/simple.txt");
    const second = resolve(fixturesDir, "text-files/identical.txt");
    expect(compareFilesEfficiently(first, second)).toEqual({
      needsDetailedDiff: false,
    });
  });

  it("requests a detailed diff for different UTF-8 text", () => {
    const first = resolve(fixturesDir, "text-files/simple.txt");
    const second = resolve(fixturesDir, "text-files/simple-modified.txt");
    expect(compareFilesEfficiently(first, second)).toEqual({
      needsDetailedDiff: true,
    });
  });

  it("rejects different invalid UTF-8 bytes as binary", () => {
    const directory = fs.mkdtempSync(join(tmpdir(), "file-utils-"));
    temporaryDirectories.push(directory);
    const first = join(directory, "first.bin");
    const second = join(directory, "second.bin");
    fs.writeFileSync(first, Buffer.from([0x80]));
    fs.writeFileSync(second, Buffer.from([0x81]));

    expect(() => compareFilesEfficiently(first, second)).toThrow(
      "Binary files differ",
    );
  });

  it("compares large files incrementally without loading them as text", () => {
    const directory = fs.mkdtempSync(join(tmpdir(), "file-utils-large-"));
    temporaryDirectories.push(directory);
    const first = join(directory, "first.bin");
    const second = join(directory, "second.bin");
    const size = 10 * 1024 * 1024 + 1;
    fs.writeFileSync(first, "");
    fs.writeFileSync(second, "");
    fs.truncateSync(first, size);
    fs.truncateSync(second, size);

    expect(compareFilesEfficiently(first, second)).toEqual({
      needsDetailedDiff: false,
    });

    const descriptor = fs.openSync(second, "r+");
    try {
      fs.writeSync(descriptor, Buffer.from([1]), 0, 1, size - 1);
    } finally {
      fs.closeSync(descriptor);
    }

    expect(() => compareFilesEfficiently(first, second)).toThrow(
      "Large files differ",
    );
  });
});
