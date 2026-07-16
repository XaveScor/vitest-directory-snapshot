# vitest-directory-snapshot

Exact directory-tree snapshots for Vitest. The matcher compares entry names,
entry types, empty directories, and file bytes.

## Requirements

- Node.js 20, 22, or 24 and newer
- Vitest 4.1.10 or newer within the current major version

## Installation

```sh
pnpm add --save-dev vitest vitest-directory-snapshot
```

## Setup

Register the default matcher in your Vitest configuration:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["vitest-directory-snapshot/setup"],
  },
});
```

The setup entry point also installs the TypeScript matcher declaration. Vitest
globals are not required.

For a custom snapshot directory name, use your own setup file:

```ts
// test/setup.ts
import { expect } from "vitest";
import { createToMatchDirSnapshot } from "vitest-directory-snapshot";

expect.extend({
  toMatchDirSnapshot: createToMatchDirSnapshot({
    snapshotDirectoryName: "__generated_snapshots__",
  }),
});
```

`snapshotDirectoryName` must be one path component. It defaults to
`__dir_snapshots__`. The `VITEST_DIR_SNAPSHOT_DIR` environment variable can
override the default and follows the same restriction.

## Usage

The received value must be an absolute path to an existing directory:

```ts
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("generated client", () => {
  const output = resolve("test-output/client");
  expect(output).toMatchDirSnapshot();
});
```

When a test owns multiple directory snapshots, all invocations must have a
non-empty hint and each hint must be unique within that test. A single call may
omit the hint:

```ts
expect(clientOutput).toMatchDirSnapshot("client");
expect(serverOutput).toMatchDirSnapshot("server");
```

Create or update snapshots with Vitest's standard flag:

```sh
vitest --update-snapshots
```

Missing snapshots are created when Vitest's update mode is `new`. Existing
snapshots are replaced when the mode is `all`; stale files are not retained.

## Snapshot Semantics

- Directory contents are compared in both directions.
- Small UTF-8 text files receive a bounded line diff.
- Binary and large files are compared byte-for-byte with bounded memory.
- Empty directories contain a reserved `.vitest-directory-snapshot-empty`
  marker so Git can preserve them. Source directories may not contain that
  reserved name.
- Symbolic links and special filesystem entries are rejected rather than
  followed.
- Permissions, timestamps, ownership, hard-link identity, and extended
  attributes are not compared.
- `.not.toMatchDirSnapshot()` is intentionally unsupported.

## Public API

```ts
interface DirectorySnapshotOptions {
  snapshotDirectoryName?: string;
}

createToMatchDirSnapshot(options?): DirectorySnapshotMatcher;
```
