import { describe, expect, it } from "vitest";
import { join, parse, resolve } from "node:path";
import {
  assertPathsDoNotOverlap,
  assertSafeDirectoryName,
  validatePath,
} from "./pathSafety.js";

describe("path safety", () => {
  it("normalizes paths", () => {
    expect(validatePath(join("some", ".", "path", "..", "other"))).toBe(
      resolve("some", "other"),
    );
  });

  it("rejects empty paths", () => {
    expect(() => validatePath("")).toThrow("Path cannot be empty");
  });

  it("accepts the base path and its children", () => {
    const basePath = resolve("allowed", "base");
    expect(validatePath(basePath, basePath)).toBe(basePath);
    expect(validatePath(join(basePath, "child"), basePath)).toBe(
      join(basePath, "child"),
    );
    expect(validatePath(join(basePath, "..evil"), basePath)).toBe(
      join(basePath, "..evil"),
    );
  });

  it("rejects paths outside the base", () => {
    const root = parse(resolve("allowed")).root;
    const basePath = join(root, "allowed", "base");
    expect(() => validatePath(join(root, "outside"), basePath)).toThrow(
      "resolves outside of allowed base path",
    );
  });

  it("accepts only one safe snapshot directory component", () => {
    expect(() => assertSafeDirectoryName("__snapshots__")).not.toThrow();
    expect(() => assertSafeDirectoryName("../snapshots")).toThrow(
      "single non-empty path component",
    );
    expect(() => assertSafeDirectoryName("a/b")).toThrow(
      "single non-empty path component",
    );
  });

  it("detects equal and nested paths in either direction", () => {
    const parent = resolve("parent");
    const child = join(parent, "child");
    expect(() => assertPathsDoNotOverlap(parent, parent)).toThrow(
      "must not overlap",
    );
    expect(() => assertPathsDoNotOverlap(parent, child)).toThrow(
      "must not overlap",
    );
    expect(() => assertPathsDoNotOverlap(child, parent)).toThrow(
      "must not overlap",
    );
    expect(() =>
      assertPathsDoNotOverlap(parent, resolve("sibling")),
    ).not.toThrow();
  });
});
