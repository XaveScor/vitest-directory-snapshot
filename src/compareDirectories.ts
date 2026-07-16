import * as fs from "node:fs";
import { join } from "node:path";
import { EMPTY_DIRECTORY_MARKER } from "./copyDirectory.js";
import { createContentDiff } from "./diffUtils.js";
import { compareFilesEfficiently } from "./fileUtils.js";
import { isNodeError, validatePath } from "./pathSafety.js";

export function compareDirectories(src: string, dest: string): void {
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);

  validateDirectory(safeSrc, "Source directory");
  validateDirectory(safeDest, "Snapshot directory");
  compareDirectoryContents(safeSrc, safeDest);
}

function compareDirectoryContents(src: string, dest: string): void {
  const srcEntries = readDirectory(src, "source");
  const rawDestEntries = readDirectory(dest, "snapshot");

  if (srcEntries.some((entry) => entry.name === EMPTY_DIRECTORY_MARKER)) {
    throw new Error(
      `Source contains reserved snapshot marker "${join(src, EMPTY_DIRECTORY_MARKER)}"`,
    );
  }

  const marker = rawDestEntries.find(
    (entry) => entry.name === EMPTY_DIRECTORY_MARKER,
  );
  const destEntries = rawDestEntries.filter(
    (entry) => entry.name !== EMPTY_DIRECTORY_MARKER,
  );

  if (marker) {
    const markerPath = join(dest, EMPTY_DIRECTORY_MARKER);
    if (!marker.isFile() || fs.statSync(markerPath).size !== 0) {
      throw new Error(
        `Invalid empty-directory marker "${markerPath}": expected an empty regular file. Run tests with --update-snapshots to update.`,
      );
    }
  }

  if (marker && (srcEntries.length > 0 || destEntries.length > 0)) {
    throw new Error(
      `Invalid empty-directory marker in non-empty snapshot directory "${dest}". Run tests with --update-snapshots to update.`,
    );
  }

  if (!marker && srcEntries.length === 0) {
    throw new Error(
      `Snapshot does not preserve empty source directory "${src}". Run tests with --update-snapshots to update.`,
    );
  }

  const srcEntryMap = new Map(srcEntries.map((entry) => [entry.name, entry]));
  const destEntryMap = new Map(destEntries.map((entry) => [entry.name, entry]));

  const missingEntries = srcEntries
    .filter((entry) => !destEntryMap.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  const extraEntries = destEntries
    .filter((entry) => !srcEntryMap.has(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (missingEntries.length > 0 || extraEntries.length > 0) {
    const details = [
      missingEntries.length > 0
        ? `Missing from snapshot: ${formatEntryList(missingEntries)}`
        : undefined,
      extraEntries.length > 0
        ? `Extra in snapshot: ${formatEntryList(extraEntries)}`
        : undefined,
    ].filter(Boolean);
    throw new Error(
      `Directory entries differ in "${src}": ${details.join(". ")}. Run tests with --update-snapshots to update.`,
    );
  }

  for (const srcEntry of srcEntries) {
    const destEntry = destEntryMap.get(srcEntry.name)!;
    const srcPath = join(src, srcEntry.name);
    const destPath = join(dest, srcEntry.name);

    assertSupportedEntry(srcEntry, srcPath, "source");
    assertSupportedEntry(destEntry, destPath, "snapshot");

    if (srcEntry.isDirectory() !== destEntry.isDirectory()) {
      throw new Error(
        `Type mismatch for "${srcEntry.name}": source is ${describeEntry(srcEntry)}, snapshot is ${describeEntry(destEntry)}`,
      );
    }

    if (srcEntry.isDirectory()) {
      compareDirectoryContents(srcPath, destPath);
      continue;
    }

    const result = compareFilesEfficiently(srcPath, destPath);
    if (result.needsDetailedDiff) {
      const srcContent = fs.readFileSync(srcPath, "utf8");
      const destContent = fs.readFileSync(destPath, "utf8");
      const diff = createContentDiff(
        srcContent,
        destContent,
        srcPath,
        destPath,
      );
      throw new Error(
        `File content differs:\n\n${diff}\n\nRun tests with --update-snapshots to update the snapshot.`,
      );
    }
  }
}

function validateDirectory(path: string, label: string): void {
  try {
    const stats = fs.lstatSync(path);
    if (!stats.isDirectory()) {
      throw new Error(`${label} "${path}" is not a directory`);
    }
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      const updateHint =
        label === "Snapshot directory"
          ? " Run tests with --update-snapshots to create it."
          : "";
      throw new Error(`${label} "${path}" does not exist.${updateHint}`, {
        cause: error,
      });
    }
    throw error;
  }
}

function readDirectory(path: string, label: string): fs.Dirent[] {
  try {
    return fs.readdirSync(path, { withFileTypes: true });
  } catch (error: unknown) {
    throw new Error(
      `Failed to read ${label} directory "${path}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function assertSupportedEntry(
  entry: fs.Dirent,
  path: string,
  label: string,
): void {
  if (entry.isSymbolicLink()) {
    throw new Error(`Symbolic links are not supported in ${label}: "${path}"`);
  }
  if (!entry.isDirectory() && !entry.isFile()) {
    throw new Error(
      `Special filesystem entries are not supported in ${label}: "${path}"`,
    );
  }
}

function describeEntry(entry: fs.Dirent): string {
  if (entry.isDirectory()) return "a directory";
  if (entry.isFile()) return "a file";
  if (entry.isSymbolicLink()) return "a symbolic link";
  return "a special filesystem entry";
}

function formatEntryList(entries: string[]): string {
  const visibleEntries = entries.slice(0, 5).map((entry) => `"${entry}"`);
  const remainder = entries.length - visibleEntries.length;
  return `${visibleEntries.join(", ")}${remainder > 0 ? ` and ${remainder} more` : ""}`;
}
