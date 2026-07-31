/**
 * Test mock for `@tauri-apps/api/core`. In unit tests we never cross the real
 * IPC boundary; repositories are mocked at the container level, but this mock
 * guarantees an accidental real import fails loudly rather than hitting Tauri.
 */
export const invoke = (): never => {
  throw new Error(
    "Real Tauri invoke() called in a unit test — mock the repository instead.",
  );
};
