import * as fs from "node:fs";
import { join } from "node:path";
import { validatePath } from "./pathSafety.js";

export function copyDirectory(src: string, dest: string) {
  // Validate and normalize paths
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);
  
  try {
    fs.mkdirSync(safeDest, { recursive: true });
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied creating directory "${safeDest}"`);
    } else if (error.code === 'EEXIST' && !fs.lstatSync(safeDest).isDirectory()) {
      throw new Error(`Cannot create directory "${safeDest}": path exists but is not a directory`);
    }
    throw new Error(`Failed to create directory "${safeDest}": ${error.message}`);
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(safeSrc, { withFileTypes: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Source directory "${safeSrc}" does not exist`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading source directory "${safeSrc}"`);
    }
    throw new Error(`Failed to read source directory "${safeSrc}": ${error.message}`);
  }
  
  for (const entry of entries) {
    const srcPath = join(safeSrc, entry.name);
    const destPath = join(safeDest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (error: any) {
        if (error.code === 'EACCES') {
          throw new Error(`Permission denied copying file "${srcPath}" to "${destPath}"`);
        } else if (error.code === 'ENOSPC') {
          throw new Error(`Not enough disk space to copy "${srcPath}" to "${destPath}"`);
        }
        throw new Error(`Failed to copy file "${srcPath}" to "${destPath}": ${error.message}`);
      }
    }
  }
  
  // Keep empty directories in git - only add .gitkeep if directory is empty
  if (entries.length === 0) {
    try {
      fs.writeFileSync(join(safeDest, ".gitkeep"), "");
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied creating .gitkeep file in "${safeDest}"`);
      }
      throw new Error(`Failed to create .gitkeep file in "${safeDest}": ${error.message}`);
    }
  }
}
