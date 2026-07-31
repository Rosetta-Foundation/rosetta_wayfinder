import { injectable } from "inversify";
import { ipcInvoke, IPC } from "../ipc";
import { LedgerEntry } from "../types";

/**
 * Resource-access seam for git operations. Wraps the thin Rust commands
 * (backed by libgit2) via Tauri `invoke`. Contains no business logic — every
 * method is a near-1:1 pass-through to a native command (ADR-0003).
 *
 * This is the ONLY place git IPC calls appear. Services orchestrate; this
 * repository just accesses the resource.
 */
export interface IGitRepository {
  /** True when a git repository exists at `repoPath`. */
  isRepo(repoPath: string): Promise<boolean>;
  /** Initialize a git repository at `repoPath` (idempotent on the Rust side). */
  init(repoPath: string): Promise<void>;
  /** Stage all changes and commit with `message`. Returns the new commit SHA. */
  commitAll(repoPath: string, message: string): Promise<string>;
  /** Return up to `limit` most-recent commits, newest first. */
  log(repoPath: string, limit: number): Promise<LedgerEntry[]>;
}

@injectable()
export class GitRepository implements IGitRepository {
  /** @inheritDoc */
  async isRepo(repoPath: string): Promise<boolean> {
    return ipcInvoke<boolean>(IPC.gitIsRepo, { repoPath });
  }

  /** @inheritDoc */
  async init(repoPath: string): Promise<void> {
    await ipcInvoke<void>(IPC.gitInit, { repoPath });
  }

  /** @inheritDoc */
  async commitAll(repoPath: string, message: string): Promise<string> {
    return ipcInvoke<string>(IPC.gitCommitAll, { repoPath, message });
  }

  /** @inheritDoc */
  async log(repoPath: string, limit: number): Promise<LedgerEntry[]> {
    return ipcInvoke<LedgerEntry[]>(IPC.gitLog, { repoPath, limit });
  }
}
