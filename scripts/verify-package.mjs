import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const manifest = JSON.parse(
  await readFile(resolve(dist, "package.json"), "utf8"),
);

assert.deepEqual(Object.keys(manifest.exports).sort(), [
  ".",
  "./package.json",
  "./setup",
]);
assert.equal(manifest.peerDependencies.vitest, "^4.1.10");

const esm = await import(pathToFileURL(resolve(dist, "index.mjs")));
const require = createRequire(import.meta.url);
const cjs = require(resolve(dist, "index.js"));

for (const module of [esm, cjs]) {
  assert.equal(typeof module.createToMatchDirSnapshot, "function");
  assert.deepEqual(Object.keys(module), ["createToMatchDirSnapshot"]);
}

const esmDeclaration = await readFile(
  resolve(dist, "__compiled__/esm/src/index.d.mts"),
  "utf8",
);
assert.match(esmDeclaration, /import "\.\/types\.js"/);
assert.match(esmDeclaration, /DirectorySnapshotOptions/);
