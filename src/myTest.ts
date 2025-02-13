import { it, type TestAPI } from "vitest";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

type Use<T> = (value: T) => Promise<void>;
export async function tmpDir(
  /* @preserve */
  {}: any,
  use: Use<string>,
): Promise<void> {
  const tempdir = await fs.mkdtemp(join(tmpdir(), "foo-"));

  await use(tempdir);

  await fs.rm(tempdir, { recursive: true });
}

export const myTest: TestAPI<{ tmpDir: string }> = it.extend({
  tmpDir,
});
