import * as fs from "node:fs";
import { createHash } from "node:crypto";

// File size threshold for using streaming (10MB)
const STREAMING_THRESHOLD = 10 * 1024 * 1024;

// Buffer size for checking if file is binary (first 8KB)
const BINARY_CHECK_SIZE = 8192;

export function isBinaryFile(filePath: string): boolean {
  try {
    const buffer = Buffer.alloc(BINARY_CHECK_SIZE);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, BINARY_CHECK_SIZE, 0);
    fs.closeSync(fd);
    
    // Check for null bytes which indicate binary content
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    
    return false;
  } catch {
    // If we can't read the file, assume it's binary to be safe
    return true;
  }
}

export function getFileHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function getFileHashSync(filePath: string): string {
  const hash = createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

export function shouldUseStreaming(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.size > STREAMING_THRESHOLD;
  } catch {
    return false;
  }
}

export function compareFilesEfficiently(srcPath: string, destPath: string): { needsDetailedDiff: boolean } {
  // Check if files are binary
  const srcIsBinary = isBinaryFile(srcPath);
  const destIsBinary = isBinaryFile(destPath);
  
  if (srcIsBinary !== destIsBinary) {
    throw new Error(`File type mismatch: "${srcPath}" is ${srcIsBinary ? 'binary' : 'text'} but "${destPath}" is ${destIsBinary ? 'binary' : 'text'}`);
  }
  
  // For binary files or large files, use hash comparison
  if (srcIsBinary || shouldUseStreaming(srcPath) || shouldUseStreaming(destPath)) {
    const srcHash = getFileHashSync(srcPath);
    const destHash = getFileHashSync(destPath);
    
    if (srcHash !== destHash) {
      if (srcIsBinary) {
        throw new Error(`Binary files differ: "${srcPath}" and "${destPath}" have different content`);
      } else {
        throw new Error(`Large files differ: "${srcPath}" and "${destPath}" have different content. Use a diff tool to compare.`);
      }
    }
    return { needsDetailedDiff: false };
  }
  
  // For small text files, indicate that detailed diff is needed
  return { needsDetailedDiff: true };
}

export function getFileStats(filePath: string) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      isBinary: isBinaryFile(filePath),
      shouldStream: stats.size > STREAMING_THRESHOLD
    };
  } catch (error: any) {
    throw new Error(`Failed to get file stats for "${filePath}": ${error.message}`);
  }
}