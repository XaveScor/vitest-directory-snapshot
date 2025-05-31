export function createContentDiff(
  actual: string,
  expected: string,
  actualPath: string,
  expectedPath: string
): string {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  
  const maxLines = Math.max(actualLines.length, expectedLines.length);
  const diffLines: string[] = [];
  
  // Add header
  diffLines.push(`Content differs between files:`);
  diffLines.push(`  Actual:   ${actualPath}`);
  diffLines.push(`  Expected: ${expectedPath}`);
  diffLines.push('');
  
  // Find first and last differing lines for context
  let firstDiff = -1;
  let lastDiff = -1;
  
  for (let i = 0; i < maxLines; i++) {
    const actualLine = actualLines[i] || '';
    const expectedLine = expectedLines[i] || '';
    
    if (actualLine !== expectedLine) {
      if (firstDiff === -1) firstDiff = i;
      lastDiff = i;
    }
  }
  
  if (firstDiff === -1) {
    // This shouldn't happen, but just in case
    diffLines.push('Files appear identical but comparison failed');
    return diffLines.join('\n');
  }
  
  // Show context around differences (3 lines before and after)
  const contextLines = 3;
  const startLine = Math.max(0, firstDiff - contextLines);
  const endLine = Math.min(maxLines - 1, lastDiff + contextLines);
  
  // Add line numbers and content
  for (let i = startLine; i <= endLine; i++) {
    const lineNum = i + 1;
    const actualLine = actualLines[i] || '';
    const expectedLine = expectedLines[i] || '';
    
    if (actualLine !== expectedLine) {
      if (actualLine !== '') {
        diffLines.push(`- ${lineNum.toString().padStart(3)}: ${actualLine}`);
      }
      if (expectedLine !== '') {
        diffLines.push(`+ ${lineNum.toString().padStart(3)}: ${expectedLine}`);
      }
      if (actualLine === '') {
        diffLines.push(`- ${lineNum.toString().padStart(3)}: <missing line>`);
      }
      if (expectedLine === '') {
        diffLines.push(`+ ${lineNum.toString().padStart(3)}: <missing line>`);
      }
    } else {
      diffLines.push(`  ${lineNum.toString().padStart(3)}: ${actualLine}`);
    }
  }
  
  // Add summary
  diffLines.push('');
  diffLines.push(`Lines in actual: ${actualLines.length}, Lines in expected: ${expectedLines.length}`);
  
  return diffLines.join('\n');
}