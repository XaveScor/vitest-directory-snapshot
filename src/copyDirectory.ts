import * as fs from "node:fs";
import { join } from "node:path";
import { validatePath } from "./pathSafety.js";

export function copyDirectory(src: string, dest: string) {
  // Validate and normalize paths
  const safeSrc = validatePath(src);
  const safeDest = validatePath(dest);
  
  fs.mkdirSync(safeDest, { recursive: true });

  const entries = fs.readdirSync(safeSrc, { withFileTypes: true });
  // Keep empty directories in git
  fs.writeFileSync(join(safeDest, ".gitkeep"), "");
  for (const entry of entries) {
    const srcPath = join(safeSrc, entry.name);
    const destPath = join(safeDest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
