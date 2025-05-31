import * as fs from "node:fs";
import { join } from "node:path";
import { validatePath } from "./pathSafety.js";
import { createContentDiff } from "./diffUtils.js";
import { compareFilesEfficiently } from "./fileUtils.js";

export function compareDirectories(
  src: string,
  dest: string,
  skipDirChecks = false,
) {
  // Validate and normalize paths
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);
  if (!skipDirChecks) {
    try {
      const srcStats = fs.lstatSync(safeSrc);
      if (!srcStats.isDirectory()) {
        throw new Error(`Source path "${safeSrc}" exists but is not a directory (it's a ${srcStats.isFile() ? 'file' : srcStats.isSymbolicLink() ? 'symlink' : 'special file'})`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Source directory "${safeSrc}" does not exist`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing source directory "${safeSrc}"`);
      } else if (error.message.includes('not a directory')) {
        throw error;
      }
      throw new Error(`Failed to access source directory "${safeSrc}": ${error.message}`);
    }

    try {
      const destStats = fs.lstatSync(safeDest);
      if (!destStats.isDirectory()) {
        throw new Error(`Destination path "${safeDest}" exists but is not a directory (it's a ${destStats.isFile() ? 'file' : destStats.isSymbolicLink() ? 'symlink' : 'special file'})`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Snapshot directory "${safeDest}" does not exist. Run tests with --update-snapshots to create it.`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing snapshot directory "${safeDest}"`);
      } else if (error.message.includes('not a directory')) {
        throw error;
      }
      throw new Error(`Failed to access snapshot directory "${safeDest}": ${error.message}`);
    }
  }

  let srcEntries: fs.Dirent[];
  let destEntries: fs.Dirent[];
  
  try {
    srcEntries = fs.readdirSync(safeSrc, { withFileTypes: true });
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading source directory "${safeSrc}"`);
    }
    throw new Error(`Failed to read source directory "${safeSrc}": ${error.message}`);
  }
  
  try {
    destEntries = fs.readdirSync(safeDest, { withFileTypes: true });
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading snapshot directory "${safeDest}"`);
    }
    throw new Error(`Failed to read snapshot directory "${safeDest}": ${error.message}`);
  }

  // Create a map for O(1) lookup instead of O(n) find operation
  const destEntryMap = new Map<string, fs.Dirent>();
  for (const entry of destEntries) {
    destEntryMap.set(entry.name, entry);
  }

  for (const srcEntry of srcEntries) {
    const srcPath = join(safeSrc, srcEntry.name);
    const destPath = join(safeDest, srcEntry.name);

    const destEntry = destEntryMap.get(srcEntry.name);
    if (!destEntry) {
      const availableFiles = destEntries.map(entry => entry.name).sort();
      const fileCount = availableFiles.length;
      const fileList = fileCount > 0 ? availableFiles.slice(0, 5).join(', ') + (fileCount > 5 ? ` and ${fileCount - 5} more` : '') : 'none';
      throw new Error(`File/directory "${srcEntry.name}" exists in source but not in snapshot. Available in snapshot: ${fileList}. Run tests with --update-snapshots to update.`);
    }

    if (srcEntry.isDirectory()) {
      if (!destEntry.isDirectory()) {
        throw new Error(`Type mismatch: "${srcEntry.name}" is a directory in source but a ${destEntry.isFile() ? 'file' : 'special item'} in snapshot`);
      }
      compareDirectories(srcPath, destPath, true);
    } else {
      if (!destEntry.isFile()) {
        throw new Error(`Type mismatch: "${srcEntry.name}" is a file in source but a ${destEntry.isDirectory() ? 'directory' : 'special item'} in snapshot`);
      }
      
      try {
        // Try efficient comparison first (handles binary files and large files)
        const result = compareFilesEfficiently(srcPath, destPath);
        
        // If it needs detailed diff (small text files), do content comparison
        if (result.needsDetailedDiff) {
          let srcContent: string;
          let destContent: string;
          
          try {
            srcContent = fs.readFileSync(srcPath, "utf8");
          } catch (readError: any) {
            if (readError.code === 'EACCES') {
              throw new Error(`Permission denied reading file "${srcPath}"`);
            } else if (readError.code === 'EISDIR') {
              throw new Error(`Expected "${srcPath}" to be a file but it's a directory`);
            }
            throw new Error(`Failed to read file "${srcPath}": ${readError.message}`);
          }
          
          try {
            destContent = fs.readFileSync(destPath, "utf8");
          } catch (readError: any) {
            if (readError.code === 'EACCES') {
              throw new Error(`Permission denied reading snapshot file "${destPath}"`);
            } else if (readError.code === 'EISDIR') {
              throw new Error(`Expected "${destPath}" to be a file but it's a directory`);
            }
            throw new Error(`Failed to read snapshot file "${destPath}": ${readError.message}`);
          }

          if (srcContent !== destContent) {
            const diff = createContentDiff(srcContent, destContent, srcPath, destPath);
            throw new Error(`File content differs:\n\n${diff}\n\nRun tests with --update-snapshots to update the snapshot.`);
          }
        }
      } catch (error: any) {
        // If it's a binary or large file difference, re-throw with additional context
        if (error.message.includes('Binary files differ') || error.message.includes('Large files differ') || error.message.includes('File type mismatch')) {
          throw new Error(`${error.message}\n\nRun tests with --update-snapshots to update the snapshot.`);
        }
        
        // Re-throw other errors as-is
        throw error;
      }
    }
  }
}
