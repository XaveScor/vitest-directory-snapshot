interface CustomMatchers<R = unknown> {
  toMatchDirSnapshot: () => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
