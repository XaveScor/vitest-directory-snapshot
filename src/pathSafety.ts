import * as fs from "node:fs";
import { isAbsolute, parse, relative, resolve, sep } from "node:path";

export function validatePath(inputPath: string, basePath?: string): string {
  if (!inputPath) {
    throw new Error("Path cannot be empty");
  }

  const resolvedPath = resolve(inputPath);

  if (basePath) {
    const resolvedBasePath = resolve(basePath);
    const relativePath = relative(resolvedBasePath, resolvedPath);

    if (
      isAbsolute(relativePath) ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`)
    ) {
      throw new Error(
        `Path "${inputPath}" resolves outside of allowed base path "${basePath}"`,
      );
    }
  }

  return resolvedPath;
}

export function assertSafeDirectoryName(name: string): void {
  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    throw new Error(
      `Snapshot directory name must be a single non-empty path component, received "${name}"`,
    );
  }
}

export function assertNoSymlinkComponents(
  inputPath: string,
  trustedBasePath?: string,
): void {
  const absolutePath = resolve(inputPath);
  if (trustedBasePath) {
    validatePath(absolutePath, trustedBasePath);
  }
  const basePath = trustedBasePath
    ? resolve(trustedBasePath)
    : parse(absolutePath).root;
  const components = relative(basePath, absolutePath)
    .split(sep)
    .filter(Boolean);
  let currentPath = basePath;

  for (const component of components) {
    currentPath = resolve(currentPath, component);

    try {
      if (fs.lstatSync(currentPath).isSymbolicLink()) {
        throw new Error(
          `Symbolic links are not allowed in snapshot paths: "${currentPath}"`,
        );
      }
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}

export function assertPathsDoNotOverlap(
  firstPath: string,
  secondPath: string,
): void {
  const first = resolve(firstPath);
  const second = resolve(secondPath);

  if (isContainedPath(first, second) || isContainedPath(second, first)) {
    throw new Error(
      `Source and snapshot directories must not overlap: "${first}" and "${second}"`,
    );
  }
}

function isContainedPath(parentPath: string, candidatePath: string): boolean {
  const relativePath = relative(parentPath, candidatePath);
  return (
    relativePath === "" ||
    (!isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`))
  );
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
