/** @type {import('jest').Config} */
export default {
  // @swc/jest transpiles only (no per-file type-check); type-checking is the
  // build's job (`tsc`, TypeScript 7 native). legacyDecorator+decoratorMetadata
  // mirror the tsconfig flags InversifyJS requires.
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2021",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // The Tauri IPC module is mocked in tests; never import the real @tauri-apps/api.
  moduleNameMapper: {
    "^@tauri-apps/api/core$": "<rootDir>/src/__tests__/__mocks__/tauri-core.ts",
  },
};
