import * as fs from "node:fs";

export function compareDirectories(
  src: string,
  dest: string,
  skipDirChecks = false,
) {
  if (!skipDirChecks) {
    const srcStats = fs.lstatSync(src);
    if (!srcStats.isDirectory()) {
      throw new Error(`Expected "${src}" to be a directory`);
    }

    const destStats = fs.lstatSync(dest);
    if (!destStats.isDirectory()) {
      throw new Error(`Expected "${dest}" to be a directory`);
    }
  }

  const srcEntries = fs.readdirSync(src, { withFileTypes: true });
  const destEntries = fs.readdirSync(dest, { withFileTypes: true });

  if (srcEntries.length !== destEntries.length) {
    throw new Error(
      `Expected "${src}" and "${dest}" to have the same number of entries`,
    );
  }

  for (const srcEntry of srcEntries) {
    const srcPath = `${src}/${srcEntry.name}`;
    const destPath = `${dest}/${srcEntry.name}`;

    const destEntry = destEntries.find((entry) => entry.name === srcEntry.name);
    if (!destEntry) {
      throw new Error(`Expected "${srcPath}" to exist in "${dest}"`);
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
