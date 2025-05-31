import { resolve, normalize, relative } from "node:path";

export function validatePath(inputPath: string, basePath?: string): string {
  if (!inputPath) {
    throw new Error("Path cannot be empty");
  }

  // Normalize the path to resolve any '..' or '.' components
  const normalizedPath = normalize(inputPath);
  
  // Resolve to absolute path
  const resolvedPath = resolve(normalizedPath);
  
  // If a base path is provided, ensure the resolved path is within it
  if (basePath) {
    const normalizedBasePath = normalize(resolve(basePath));
    const relativePath = relative(normalizedBasePath, resolvedPath);
    
    // Check if the relative path starts with '..' which would indicate
    // the resolved path is outside the base path
    if (relativePath.startsWith('..') || relativePath === '') {
      throw new Error(
        `Path "${inputPath}" resolves outside of allowed base path "${basePath}"`
      );
    }
  }
  
  // Check for potentially dangerous path components
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /\/\//,  // Double slashes (can cause issues on some systems)
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalizedPath)) {
      throw new Error(`Path "${inputPath}" contains potentially unsafe components`);
    }
  }
  
  return resolvedPath;
}