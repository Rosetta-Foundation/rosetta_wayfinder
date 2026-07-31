/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // The Tauri IPC module is mocked in tests; never import the real @tauri-apps/api.
  moduleNameMapper: {
    '^@tauri-apps/api/core$': '<rootDir>/src/__tests__/__mocks__/tauri-core.ts',
  },
};
