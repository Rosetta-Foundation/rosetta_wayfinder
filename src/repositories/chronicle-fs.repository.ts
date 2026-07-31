import { injectable } from "inversify";
import { ipcInvoke, IPC } from "../ipc";

/**
 * Resource-access seam for filesystem operations on the chronicle repo. Wraps
 * the thin Rust fs commands via Tauri `invoke`. No business logic (ADR-0003) —
 * path composition and directory decisions belong in the service layer.
 */
export interface IChronicleFsRepository {
  /** Resolve the default chronicle repo path (e.g. `~/Wayfinder/chronicle`). */
  defaultChroniclePath(): Promise<string>;
  /** True when a file or directory exists at `path`. */
  pathExists(path: string): Promise<boolean>;
  /** Create the directory at `path`, including parents. Idempotent. */
  ensureDir(path: string): Promise<void>;
  /** Write `contents` to `path`, creating or overwriting. */
  writeFile(path: string, contents: string): Promise<void>;
  /** Read the file at `path` as UTF-8. */
  readFile(path: string): Promise<string>;
  /** Recursively list `.md` file paths under `root` (absolute paths). */
  listMarkdown(root: string): Promise<string[]>;
}

@injectable()
export class ChronicleFsRepository implements IChronicleFsRepository {
  /** @inheritDoc */
  async defaultChroniclePath(): Promise<string> {
    return ipcInvoke<string>(IPC.defaultChroniclePath);
  }

  /** @inheritDoc */
  async pathExists(path: string): Promise<boolean> {
    return ipcInvoke<boolean>(IPC.pathExists, { path });
  }

  /** @inheritDoc */
  async ensureDir(path: string): Promise<void> {
    await ipcInvoke<void>(IPC.ensureDir, { path });
  }

  /** @inheritDoc */
  async writeFile(path: string, contents: string): Promise<void> {
    await ipcInvoke<void>(IPC.writeFile, { path, contents });
  }

  /** @inheritDoc */
  async readFile(path: string): Promise<string> {
    return ipcInvoke<string>(IPC.readFile, { path });
  }

  /** @inheritDoc */
  async listMarkdown(root: string): Promise<string[]> {
    return ipcInvoke<string[]>(IPC.listMarkdown, { root });
  }
}
