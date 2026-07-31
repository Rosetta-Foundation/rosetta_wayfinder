import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import type { IGitRepository } from "../repositories/git.repository";
import type { IConfigRepository } from "../repositories/config.repository";
import { CHRONICLE_DIRS } from "../types";
import type { LedgerEntry, WayfinderConfig, WorkspaceInit } from "../types";

/**
 * Business logic for the local chronicle workspace (first-run provisioning and
 * the invisible-ledger history). Composes the git and filesystem repositories;
 * holds all decisions and orchestration (ADR-0003).
 *
 * First-run provisioning:
 *   1. Resolve the chronicle repo path (default or caller-supplied).
 *   2. Create the canonical directory layout.
 *   3. Initialize git if not already a repo.
 *   4. Seed an initial commit so the ledger has a root.
 */
export interface IWorkspaceService {
  /** Provision (or detect) the chronicle workspace. Idempotent. */
  initWorkspace(repoPath?: string): Promise<WorkspaceInit>;
  /** Return the most-recent ledger entries (newest first). */
  history(repoPath: string, limit?: number): Promise<LedgerEntry[]>;
  /** Persist a new chronicle path to config and re-initialise. */
  changeChronicle(newPath: string): Promise<WorkspaceInit>;
}

@injectable()
export class WorkspaceService implements IWorkspaceService {
  /**
   * In-flight init promises keyed by resolved repo path. Guarantees that
   * concurrent `initWorkspace` calls for the same path (e.g. React StrictMode
   * double-invoking the mount effect in dev) share one run instead of racing to
   * init + commit twice. The guard lives in the service, not the UI, so the
   * invariant holds no matter how the handler is called.
   */
  private readonly _inFlight = new Map<string, Promise<WorkspaceInit>>();

  constructor(
    @inject(WAYFINDER_TOKENS.ChronicleFsRepository)
    private readonly _fsRepo: IChronicleFsRepository,
    @inject(WAYFINDER_TOKENS.GitRepository)
    private readonly _gitRepo: IGitRepository,
    @inject(WAYFINDER_TOKENS.ConfigRepository)
    private readonly _config: IConfigRepository,
  ) {}

  /** @inheritDoc */
  async initWorkspace(repoPath?: string): Promise<WorkspaceInit> {
    // Resolution order: explicit caller arg → saved config → OS default.
    const cfg = repoPath ? {} : await this._config.load();
    const path =
      repoPath ??
      cfg.chroniclePath ??
      (await this._fsRepo.defaultChroniclePath());

    const existing = this._inFlight.get(path);
    if (existing) return existing;

    const run = this._provision(path).finally(() =>
      this._inFlight.delete(path),
    );
    this._inFlight.set(path, run);
    return run;
  }

  /** The actual provisioning sequence, guarded by {@link initWorkspace}. */
  private async _provision(path: string): Promise<WorkspaceInit> {
    const existedBefore = await this._fsRepo.pathExists(path);

    // Create the canonical directory layout (idempotent).
    for (const dir of CHRONICLE_DIRS) {
      await this._fsRepo.ensureDir(this._join(path, dir));
    }

    // Initialize git only if it isn't already a repo.
    const alreadyRepo = await this._gitRepo.isRepo(path);
    if (!alreadyRepo) {
      await this._gitRepo.init(path);
      // Seed a root commit so the ledger always has history to show.
      await this._fsRepo.writeFile(this._join(path, "chronicles/.gitkeep"), "");
      await this._gitRepo.commitAll(
        path,
        "init: initialize Wayfinder chronicle",
      );
    }

    return {
      repoPath: path,
      created: !existedBefore,
      gitReady: await this._gitRepo.isRepo(path),
    };
  }

  /** @inheritDoc */
  async changeChronicle(newPath: string): Promise<WorkspaceInit> {
    const config: WayfinderConfig = { chroniclePath: newPath };
    await this._config.save(config);
    // Clear the in-flight guard for the old path so the new path provisions fresh.
    this._inFlight.clear();
    return this.initWorkspace(newPath);
  }

  /** @inheritDoc */
  async history(repoPath: string, limit = 50): Promise<LedgerEntry[]> {
    return this._gitRepo.log(repoPath, limit);
  }

  /** Join a repo root with a relative sub-path using forward slashes. */
  private _join(root: string, sub: string): string {
    const trimmed = root.replace(/\/+$/, "");
    return `${trimmed}/${sub}`;
  }
}
