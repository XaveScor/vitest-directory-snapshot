import * as fs from "fs";

export function copyDirectory(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
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
