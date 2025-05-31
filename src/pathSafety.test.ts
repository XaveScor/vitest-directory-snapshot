import { describe, expect, it } from "vitest";
import { validatePath } from "./pathSafety.js";

describe("pathSafety", () => {
  describe("validatePath", () => {
    it("should accept valid absolute paths", () => {
      const result = validatePath("/valid/absolute/path");
      expect(result).toMatch(/^\/.*valid.*absolute.*path/);
    });

    it("should normalize paths with . and ..", () => {
      const result = validatePath("/some/./path/../other");
      expect(result).toBe("/some/other");
    });

    it("should throw for empty paths", () => {
      expect(() => validatePath("")).toThrow("Path cannot be empty");
    });

    it("should allow normalized paths that resolve safely", () => {
      // After normalization, "/valid/../../../etc/passwd" becomes "/etc/passwd" which is valid
      const result = validatePath("/valid/../../../etc/passwd");
      expect(result).toBe("/etc/passwd");
    });

    it("should allow paths with double slashes after normalization", () => {
      // normalize() removes double slashes, so this should pass
      const result = validatePath("/path//with//double//slashes");
      expect(result).toBe("/path/with/double/slashes");
    });

    it("should validate against base path", () => {
      const basePath = "/allowed/base";
      expect(() => validatePath("/allowed/base/subdir", basePath)).not.toThrow();
      expect(() => validatePath("/outside/path", basePath)).toThrow(
        "resolves outside of allowed base path"
      );
    });

    it("should prevent directory traversal with base path", () => {
      const basePath = "/allowed/base";
      expect(() => validatePath("/allowed/base/../../../etc", basePath)).toThrow(
        "resolves outside of allowed base path"
      );
    });
  });
});