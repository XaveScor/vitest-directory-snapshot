import * as fs from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import {
  assertPathsDoNotOverlap,
  isNodeError,
  validatePath,
} from "./pathSafety.js";

export const EMPTY_DIRECTORY_MARKER = ".vitest-directory-snapshot-empty";

export function copyDirectory(src: string, dest: string): void {
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);

  validateSourceDirectory(safeSrc);
  rejectDestinationSymlink(safeDest);
  assertPathsDoNotOverlap(safeSrc, safeDest);

  const destinationParent = dirname(safeDest);
  fs.mkdirSync(destinationParent, { recursive: true });
  assertPathsDoNotOverlap(
    fs.realpathSync(safeSrc),
    join(fs.realpathSync(destinationParent), basename(safeDest)),
  );

  const temporaryPath = fs.mkdtempSync(
    join(destinationParent, `.${basename(safeDest)}.tmp-`),
  );
  const backupPath = join(
    destinationParent,
    `.${basename(safeDest)}.backup-${randomUUID()}`,
  );
  let hasBackup = false;

  try {
    copyDirectoryContents(safeSrc, temporaryPath);

    if (fs.existsSync(safeDest)) {
      fs.renameSync(safeDest, backupPath);
      hasBackup = true;
    }

    try {
      fs.renameSync(temporaryPath, safeDest);
    } catch (error) {
      if (hasBackup) {
        if (fs.existsSync(safeDest)) {
          throw new Error(
            `Failed to install the new snapshot; previous snapshot retained at "${backupPath}"`,
            { cause: error },
          );
        }
        try {
          fs.renameSync(backupPath, safeDest);
          hasBackup = false;
        } catch (restoreError) {
          throw new Error(
            `Failed to install the new snapshot and restore the previous snapshot; backup retained at "${backupPath}"`,
            { cause: new AggregateError([error, restoreError]) },
          );
        }
      }
      throw error;
    }

    if (hasBackup) {
      try {
        fs.rmSync(backupPath, { recursive: true, force: true });
        hasBackup = false;
      } catch (error) {
        throw new Error(
          `Snapshot was updated, but its previous backup could not be removed from "${backupPath}"`,
          { cause: error },
        );
      }
    }
  } catch (error: unknown) {
    throw new Error(
      `Failed to update directory snapshot "${safeDest}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  } finally {
    fs.rmSync(temporaryPath, { recursive: true, force: true });
    if (hasBackup && !fs.existsSync(safeDest)) {
      try {
        fs.renameSync(backupPath, safeDest);
        hasBackup = false;
      } catch {
        // Keep the backup for manual recovery.
      }
    }
  }
}

function copyDirectoryContents(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  if (entries.some((entry) => entry.name === EMPTY_DIRECTORY_MARKER)) {
    throw new Error(
      `Source contains reserved snapshot marker "${join(src, EMPTY_DIRECTORY_MARKER)}"`,
    );
  }

  if (entries.length === 0) {
    fs.writeFileSync(join(dest, EMPTY_DIRECTORY_MARKER), "");
    return;
  }

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not supported: "${srcPath}"`);
    }

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath);
      copyDirectoryContents(srcPath, destPath);
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(
        `Special filesystem entries are not supported: "${srcPath}"`,
      );
    }

    const stats = fs.lstatSync(srcPath);
    if (!stats.isFile()) {
      throw new Error(
        `Source entry changed while creating snapshot: "${srcPath}"`,
      );
    }
    fs.copyFileSync(srcPath, destPath, fs.constants.COPYFILE_EXCL);
  }
}

function validateSourceDirectory(src: string): void {
  try {
    const stats = fs.lstatSync(src);
    if (!stats.isDirectory()) {
      throw new Error(`Source path "${src}" is not a directory`);
    }
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Source directory "${src}" does not exist`, {
        cause: error,
      });
    }
    throw error;
  }
}

function rejectDestinationSymlink(dest: string): void {
  try {
    if (fs.lstatSync(dest).isSymbolicLink()) {
      throw new Error(
        `Snapshot destination must not be a symbolic link: "${dest}"`,
      );
    }
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}
