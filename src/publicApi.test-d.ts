import { expect, expectTypeOf } from "vitest";
import {
  createToMatchDirSnapshot,
  type DirectorySnapshotOptions,
} from "vitest-directory-snapshot";
import "vitest-directory-snapshot/setup";

const options: DirectorySnapshotOptions = {
  snapshotDirectoryName: "__custom_snapshots__",
};
const matcher = createToMatchDirSnapshot(options);

expect("/absolute/directory").toMatchDirSnapshot();
expect("/absolute/directory").toMatchDirSnapshot("named output");

expectTypeOf(matcher).toBeFunction();
