import * as fs from "node:fs";

const STREAMING_THRESHOLD = 10 * 1024 * 1024;
const COMPARISON_BUFFER_SIZE = 64 * 1024;

export function compareFilesEfficiently(
  srcPath: string,
  destPath: string,
): { needsDetailedDiff: boolean } {
  const srcStats = fs.statSync(srcPath);
  const destStats = fs.statSync(destPath);
  const isLarge =
    srcStats.size > STREAMING_THRESHOLD || destStats.size > STREAMING_THRESHOLD;

  if (isLarge) {
    if (
      srcStats.size !== destStats.size ||
      !compareLargeFilesByBytes(srcPath, destPath)
    ) {
      throw new Error(
        `Large files differ: "${srcPath}" and "${destPath}" have different content. Use a diff tool to compare.`,
      );
    }
    return { needsDetailedDiff: false };
  }

  const srcContent = fs.readFileSync(srcPath);
  const destContent = fs.readFileSync(destPath);

  if (srcContent.equals(destContent)) {
    return { needsDetailedDiff: false };
  }

  if (isUtf8Text(srcContent) && isUtf8Text(destContent)) {
    return { needsDetailedDiff: true };
  }

  throw new Error(
    `Binary files differ: "${srcPath}" and "${destPath}" have different content`,
  );
}

function compareLargeFilesByBytes(srcPath: string, destPath: string): boolean {
  const srcDescriptor = fs.openSync(srcPath, "r");
  let destDescriptor: number | undefined;

  try {
    destDescriptor = fs.openSync(destPath, "r");
    const srcBuffer = Buffer.allocUnsafe(COMPARISON_BUFFER_SIZE);
    const destBuffer = Buffer.allocUnsafe(COMPARISON_BUFFER_SIZE);

    while (true) {
      const srcBytesRead = fs.readSync(
        srcDescriptor,
        srcBuffer,
        0,
        srcBuffer.length,
        null,
      );
      const destBytesRead = fs.readSync(
        destDescriptor,
        destBuffer,
        0,
        destBuffer.length,
        null,
      );

      if (srcBytesRead !== destBytesRead) return false;
      if (srcBytesRead === 0) return true;
      if (
        !srcBuffer
          .subarray(0, srcBytesRead)
          .equals(destBuffer.subarray(0, destBytesRead))
      ) {
        return false;
      }
    }
  } finally {
    fs.closeSync(srcDescriptor);
    if (destDescriptor !== undefined) {
      fs.closeSync(destDescriptor);
    }
  }
}

function isUtf8Text(content: Buffer): boolean {
  return (
    !content.includes(0) &&
    Buffer.from(content.toString("utf8"), "utf8").equals(content)
  );
}
