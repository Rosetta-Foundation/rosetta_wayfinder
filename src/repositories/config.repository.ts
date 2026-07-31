import { injectable } from "inversify";
import { IPC, ipcInvoke } from "../ipc";
import type { WayfinderConfig } from "../types";

export interface IConfigRepository {
  /** Load config from disk. Returns `{}` when the file is absent or unparseable. */
  load(): Promise<WayfinderConfig>;
  /** Persist config to disk, creating the parent directory as needed. */
  save(config: WayfinderConfig): Promise<void>;
}

@injectable()
export class ConfigRepository implements IConfigRepository {
  async load(): Promise<WayfinderConfig> {
    const path = await ipcInvoke<string>(IPC.configPath);
    const exists = await ipcInvoke<boolean>(IPC.pathExists, { path });
    if (!exists) return {};
    try {
      const raw = await ipcInvoke<string>(IPC.readFile, { path });
      return JSON.parse(raw) as WayfinderConfig;
    } catch {
      return {};
    }
  }

  async save(config: WayfinderConfig): Promise<void> {
    const path = await ipcInvoke<string>(IPC.configPath);
    // Ensure ~/.wayfinder/ exists before writing.
    const dir = path.substring(0, path.lastIndexOf("/"));
    await ipcInvoke<void>(IPC.ensureDir, { path: dir });
    await ipcInvoke<void>(IPC.writeFile, {
      path,
      contents: JSON.stringify(config, null, 2),
    });
  }
}
