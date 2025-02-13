# vitest-directory-snapshot

## Overview

vitest-directory-snapshot is a testing utility for Vitest that enables snapshot testing of directory structures. It provides an extended version of Vitest's test function, along with a custom matcher, to assert that a directory (its structure and file contents) matches a stored snapshot. This allows you to easily compare changes in file system hierarchies during testing.

## Installation

Install the package along with Vitest (if not already installed) using your package manager. For example, using pnpm:

    pnpm install vitest-directory-snapshot
    pnpm install vitest --save-dev

## Public API

The package "vitest-directory-snapshot" exposes the following public API:

1. test  
 • An extended version of Vitest's test function.  
 • It automatically supports directory snapshot testing via a temporary directory fixture.

2. toMatchDirSnapshot(received: unknown)  
 • A custom Vitest matcher that compares a given directory against a stored snapshot.  
 • It expects an absolute path (string) to a directory and verifies that its structure and file contents match the stored snapshot.

### Example Usage

    import { describe, expect } from "vitest";
    import { test, toMatchDirSnapshot } from "vitest-directory-snapshot";
    
    describe("Directory Snapshot Tests", () => {
      test("snapshot comparison", () => {
        // Provide an absolute path to the directory you want to verify
        expect("/absolute/path/to/directory").toMatchDirSnapshot();
      });
    });

#### Matcher Initialization

To register the custom matcher in Vitest, add a setup file (e.g. `setupFile.ts`) with the following content:

```ts
import { createToMatchDirSnapshot } from "vitest-directory-snapshot";

expect.extend({
  toMatchDirSnapshot: createToMatchDirSnapshot({ snapshotDirName: "custom_snapshots" }),
});
```

You can also configure the custom snapshot directory name by setting the environment variable `VITEST_DIR_SNAPSHOT_DIR` when running tests.
