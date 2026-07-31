import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import type { IGitRepository } from "../repositories/git.repository";
import type { IClockRepository } from "../repositories/clock.repository";
import type { NoteSaveResult } from "../types";

/**
 * Business logic for daily note capture — the core "second brain" loop
 * (PRD-0010 §3.4). Notes are authoritative input written to
 * `chronicles/notes/<date>.md`, matching the engineer chronicle format so the
 * two apps interoperate on the same files.
 *
 * Every save is an auto-commit (the invisible ledger, §3.2). Composes the
 * filesystem, git, and clock repositories; holds all decisions here (ADR-0003).
 */
export interface INotesService {
  /** Read today's note, or '' when none exists yet. */
  readToday(repoPath: string): Promise<string>;
  /** Read the note for a specific date, or '' when none exists. */
  readNote(repoPath: string, date: string): Promise<string>;
  /**
   * Append a timestamped entry to today's note and auto-commit. Notes are a
   * running log of discrete entries, not one overwritten blob — this preserves
   * everything captured earlier in the day and lets the editor clear for the
   * next entry. Returns the commit result plus the full updated note text.
   */
  appendEntry(repoPath: string, entry: string): Promise<NoteSaveResult>;
}

@injectable()
export class NotesService implements INotesService {
  constructor(
    @inject(WAYFINDER_TOKENS.ChronicleFsRepository)
    private readonly _fsRepo: IChronicleFsRepository,
    @inject(WAYFINDER_TOKENS.GitRepository)
    private readonly _gitRepo: IGitRepository,
    @inject(WAYFINDER_TOKENS.ClockRepository)
    private readonly _clock: IClockRepository,
  ) {}

  /** @inheritDoc */
  async readToday(repoPath: string): Promise<string> {
    return this.readNote(repoPath, this._clock.today());
  }

  /** @inheritDoc */
  async readNote(repoPath: string, date: string): Promise<string> {
    const abs = this._notePath(repoPath, date);
    if (!(await this._fsRepo.pathExists(abs))) return "";
    return this._fsRepo.readFile(abs);
  }

  /** @inheritDoc */
  async appendEntry(repoPath: string, entry: string): Promise<NoteSaveResult> {
    const date = this._clock.today();
    const relativePath = this._noteRelativePath(date);
    const abs = this._notePath(repoPath, date);

    // Read whatever is already in today's note so we append, never overwrite.
    const existing = await this.readNote(repoPath, date);
    const block = this._formatEntry(entry);
    const updated = existing
      ? `${existing.replace(/\s*$/, "")}\n\n${block}\n`
      : `${block}\n`;

    await this._fsRepo.ensureDir(this._join(repoPath, "chronicles/notes"));
    await this._fsRepo.writeFile(abs, updated);

    const sha = await this._gitRepo.commitAll(repoPath, `note-save: ${date}`);

    return { date, relativePath, sha, note: updated };
  }

  /**
   * Render one entry as a timestamped Markdown block. The heading marks when the
   * thought was captured (local time), so a day's note reads as a running log.
   */
  private _formatEntry(entry: string): string {
    const time = this._clock.now();
    return `### ${time}\n\n${entry.trim()}`;
  }

  /** Repo-relative path for a date's note. */
  private _noteRelativePath(date: string): string {
    return `chronicles/notes/${date}.md`;
  }

  /** Absolute path for a date's note. */
  private _notePath(repoPath: string, date: string): string {
    return this._join(repoPath, this._noteRelativePath(date));
  }

  /** Join a repo root with a relative sub-path using forward slashes. */
  private _join(root: string, sub: string): string {
    return `${root.replace(/\/+$/, "")}/${sub}`;
  }
}
