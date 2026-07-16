const CONTEXT_LINES = 3;
const MAX_RENDERED_LINES = 200;

export function createContentDiff(
  actual: string,
  expected: string,
  actualPath: string,
  expectedPath: string,
): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const maxLines = Math.max(actualLines.length, expectedLines.length);
  const differentLines: number[] = [];

  for (let index = 0; index < maxLines; index++) {
    if (getLine(actualLines, index) !== getLine(expectedLines, index)) {
      differentLines.push(index);
    }
  }

  const output = [
    "Content differs between files:",
    `  Actual:   ${actualPath}`,
    `  Expected: ${expectedPath}`,
    "",
  ];

  if (differentLines.length === 0) {
    output.push("Files contain the same decoded text but different bytes");
    return output.join("\n");
  }

  const visibleLines = new Set<number>();
  for (const differentLine of differentLines) {
    for (
      let index = Math.max(0, differentLine - CONTEXT_LINES);
      index <= Math.min(maxLines - 1, differentLine + CONTEXT_LINES);
      index++
    ) {
      visibleLines.add(index);
    }
  }

  const sortedVisibleLines = [...visibleLines].slice(0, MAX_RENDERED_LINES);
  let previousLine = -1;

  for (const index of sortedVisibleLines) {
    if (previousLine >= 0 && index > previousLine + 1) {
      output.push(`... ${index - previousLine - 1} lines omitted ...`);
    }

    const lineNumber = (index + 1).toString().padStart(3);
    const actualLine = getLine(actualLines, index);
    const expectedLine = getLine(expectedLines, index);

    if (actualLine === expectedLine) {
      output.push(`  ${lineNumber}: ${actualLine}`);
    } else {
      output.push(`- ${lineNumber}: ${formatLine(actualLine)}`);
      output.push(`+ ${lineNumber}: ${formatLine(expectedLine)}`);
    }
    previousLine = index;
  }

  if (visibleLines.size > sortedVisibleLines.length) {
    output.push(
      `... ${visibleLines.size - sortedVisibleLines.length} lines omitted ...`,
    );
  }

  output.push("");
  output.push(
    `Lines in actual: ${actualLines.length}, Lines in expected: ${expectedLines.length}`,
  );
  return output.join("\n");
}

function getLine(lines: string[], index: number): string | undefined {
  return index < lines.length ? lines[index] : undefined;
}

function formatLine(line: string | undefined): string {
  return line === undefined ? "<missing line>" : line;
}
