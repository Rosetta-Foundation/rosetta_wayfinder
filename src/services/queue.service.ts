import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import type { IGitRepository } from "../repositories/git.repository";
import type { QueueState } from "../types";
import { QUEUE_RELATIVE_PATH } from "../types";
import {
  defaultQueueContent,
  parseQueue,
  toggleItemInRaw,
} from "../utils/queue-parser";

export interface IQueueService {
  /** Load and parse the queue file. Creates it with defaults when missing. */
  loadQueue(repoPath: string): Promise<QueueState>;
  /** Persist raw queue content and auto-commit. */
  saveQueue(repoPath: string, raw: string): Promise<string>;
  /** Toggle a checkbox and persist. Returns the updated QueueState. */
  toggleItem(
    repoPath: string,
    sectionTitle: string,
    itemText: string,
  ): Promise<QueueState>;
}

@injectable()
export class QueueService implements IQueueService {
  constructor(
    @inject(WAYFINDER_TOKENS.ChronicleFsRepository)
    private readonly _fsRepo: IChronicleFsRepository,
    @inject(WAYFINDER_TOKENS.GitRepository)
    private readonly _gitRepo: IGitRepository,
  ) {}

  /** @inheritDoc */
  async loadQueue(repoPath: string): Promise<QueueState> {
    const abs = this._queuePath(repoPath);
    if (!(await this._fsRepo.pathExists(abs))) {
      const content = defaultQueueContent();
      await this._fsRepo.ensureDir(this._join(repoPath, "chronicles"));
      await this._fsRepo.writeFile(abs, content);
      await this._gitRepo.commitAll(repoPath, "queue-edit: initialise queue");
      return parseQueue(content);
    }
    return parseQueue(await this._fsRepo.readFile(abs));
  }

  /** @inheritDoc */
  async saveQueue(repoPath: string, raw: string): Promise<string> {
    await this._fsRepo.writeFile(this._queuePath(repoPath), raw);
    return this._gitRepo.commitAll(repoPath, "queue-edit: update queue");
  }

  /** @inheritDoc */
  async toggleItem(
    repoPath: string,
    sectionTitle: string,
    itemText: string,
  ): Promise<QueueState> {
    const current = await this.loadQueue(repoPath);
    const updated = toggleItemInRaw(current.raw, sectionTitle, itemText);
    await this.saveQueue(repoPath, updated);
    return parseQueue(updated);
  }

  private _queuePath(repoPath: string): string {
    return this._join(repoPath, QUEUE_RELATIVE_PATH);
  }

  private _join(root: string, sub: string): string {
    return `${root.replace(/\/+$/, "")}/${sub}`;
  }
}
