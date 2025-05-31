import * as fs from "node:fs";
import { join } from "node:path";
import { validatePath } from "./pathSafety.js";

export function compareDirectories(
  src: string,
  dest: string,
  skipDirChecks = false,
) {
  // Validate and normalize paths
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);
  if (!skipDirChecks) {
    const srcStats = fs.lstatSync(safeSrc);
    if (!srcStats.isDirectory()) {
      throw new Error(`Expected "${safeSrc}" to be a directory`);
    }

    const destStats = fs.lstatSync(safeDest);
    if (!destStats.isDirectory()) {
      throw new Error(`Expected "${safeDest}" to be a directory`);
    }
  }

  const srcEntries = fs.readdirSync(safeSrc, { withFileTypes: true });
  const destEntries = fs.readdirSync(safeDest, { withFileTypes: true });

  for (const srcEntry of srcEntries) {
    const srcPath = join(safeSrc, srcEntry.name);
    const destPath = join(safeDest, srcEntry.name);

    const destEntry = destEntries.find((entry) => entry.name === srcEntry.name);
    if (!destEntry) {
      throw new Error(`Expected "${srcPath}" to exist in "${safeDest}"`);
    }

    if (srcEntry.isDirectory()) {
      compareDirectories(srcPath, destPath, true);
    } else {
      const srcContent = fs.readFileSync(srcPath, "utf8");
      const destContent = fs.readFileSync(destPath, "utf8");

      if (srcContent !== destContent) {
        throw new Error(
          `Expected "${srcPath}" and "${destPath}" to have the same content`,
        );
      }
    }
  }
}
