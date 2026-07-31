/**
 * The IPC boundary to the thin Rust core.
 *
 * This is the single seam where the frontend crosses into native code. Per
 * ADR-0003, `invoke` must ONLY be called from repositories — never from a
 * service or handler. Repositories import `ipcInvoke` from here so the Tauri
 * dependency is isolated to one module and trivially mockable in tests.
 */
import { invoke } from "@tauri-apps/api/core";

/** Thin pass-through to Tauri's `invoke`. The only place the raw API is imported. */
export const ipcInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> => invoke<T>(command, args);

/** The command names exposed by the Rust core. Keep in sync with `src-tauri/src/lib.rs`. */
export const IPC = {
  ensureDir: "ensure_dir",
  writeFile: "write_file",
  readFile: "read_file",
  pathExists: "path_exists",
  listMarkdown: "list_markdown",
  gitInit: "git_init",
  gitIsRepo: "git_is_repo",
  gitCommitAll: "git_commit_all",
  gitLog: "git_log",
  defaultChroniclePath: "default_chronicle_path",
  configPath: "config_path",
  claudeInvoke: "claude_invoke",
} as const;
