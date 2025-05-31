# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Run tests**: `pnpm test` or `vitest`
- **Run tests in watch mode**: `vitest --watch`
- **Update snapshots**: `vitest --update-snapshots` or `vitest -u`
- **Build package**: `pnpm build`
- **Type check**: `vitest typecheck`

## Architecture Overview

This is a Vitest plugin that enables directory snapshot testing. The core architecture consists of:

### Core Components

- **`toMatchDirSnapshot.ts`**: Factory function that creates the custom matcher. Handles snapshot creation, comparison, and updates using SHA-256 hashes for unique test identification.
- **`myTest.ts`**: Extended Vitest test function with `tmpDir` fixture that provides temporary directories for testing.
- **`compareDirectories.ts`**: Recursive directory comparison logic for snapshot validation.
- **`copyDirectory.ts`**: Utility for creating directory snapshots.

### Key Concepts

- **Snapshot Storage**: Snapshots are stored in `__dir_snapshots__/` (configurable via `VITEST_DIR_SNAPSHOT_DIR` env var or factory options).
- **Test Identification**: Uses combination of test name + file path + SHA-256 hash to create unique snapshot directories.
- **Matcher Registration**: The custom matcher must be registered via `expect.extend()` in setup files.

### Testing Strategy

- Tests use the extended `test` function which provides `tmpDir` fixture
- Directory snapshots are stored alongside test files
- The matcher expects absolute paths to directories
- Supports snapshot updates via Vitest's `-u` flag

### Package Structure

- **Entry point**: `src/index.ts` exports the public API
- **Types**: Available at `./types` export
- **Setup**: `setupFile.ts` registers the matcher for this project's tests