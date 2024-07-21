import { it, TestAPI } from "vitest";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const myTest: TestAPI<{ tmpDir: string }> = it.extend({
  tmpDir: async ({}, use) => {
    const tempdir = await fs.mkdtemp(join(tmpdir(), "foo-"));

    await use(tempdir);

    await fs.rm(tempdir, { recursive: true });
  },
});
