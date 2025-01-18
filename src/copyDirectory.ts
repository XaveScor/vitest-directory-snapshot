import * as fs from "node:fs";
import {join} from "node:path";

export function copyDirectory(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  // Keep empty directories in git
  fs.writeFileSync(join(dest, ".gitkeep"), "");
  for (const entry of entries) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
