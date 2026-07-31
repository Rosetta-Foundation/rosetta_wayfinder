import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import type { IClaudeRepository } from "../repositories/claude.repository";
import type { IClockRepository } from "../repositories/clock.repository";
import type { ModelChoice, StandupResult } from "../types";
import { QUEUE_RELATIVE_PATH } from "../types";
import { DEFAULT_MAX_TOKENS, resolveModelId } from "../config/claude";
import { parseQueue } from "../utils/queue-parser";
import { buildStandupPrompt, STANDUP_SYSTEM } from "../utils/standup-prompt";

export interface IStandupService {
  /** Generate a standup summary from yesterday's notes, today's notes, and the queue. */
  generate(repoPath: string, model?: ModelChoice): Promise<StandupResult>;
}

@injectable()
export class StandupService implements IStandupService {
  constructor(
    @inject(WAYFINDER_TOKENS.ChronicleFsRepository)
    private readonly _fsRepo: IChronicleFsRepository,
    @inject(WAYFINDER_TOKENS.ClaudeRepository)
    private readonly _claude: IClaudeRepository,
    @inject(WAYFINDER_TOKENS.ClockRepository)
    private readonly _clock: IClockRepository,
  ) {}

  async generate(
    repoPath: string,
    model: ModelChoice = "auto",
  ): Promise<StandupResult> {
    const todayDate = this._clock.today();

    const [priorResult, todayNotes, todayChronicle, queueRaw] =
      await Promise.all([
        this._mostRecentSession(repoPath, todayDate),
        this._readNote(repoPath, todayDate),
        this._readChronicle(repoPath, todayDate),
        this._readQueue(repoPath),
      ]);

    const queue = parseQueue(queueRaw);
    const activeSection = queue.sections.find((s) => s.title === "Active");
    const nextUpSection = queue.sections.find((s) => s.title === "Next Up");

    const prompt = buildStandupPrompt({
      priorDate: priorResult.date,
      priorChronicle: priorResult.chronicle,
      priorNotes: priorResult.notes,
      todayDate,
      todayChronicle,
      todayNotes,
      activeItems: activeSection?.items.filter((i) => !i.checked) ?? [],
      nextUpItems: nextUpSection?.items.filter((i) => !i.checked) ?? [],
    });

    const bodyJson = JSON.stringify({
      model: resolveModelId(model),
      max_tokens: DEFAULT_MAX_TOKENS,
      system: STANDUP_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const reply = await this._claude.invoke({ bodyJson });

    return {
      summary: reply.text,
      model: reply.model,
      usage: {
        inputTokens: reply.input_tokens,
        outputTokens: reply.output_tokens,
      },
    };
  }

  /**
   * Walk back from the day before today, up to 7 days, to find the most recent
   * session with either a daily chronicle or notes. Returns both for that date.
   */
  private async _mostRecentSession(
    repoPath: string,
    today: string,
  ): Promise<{ date: string; chronicle: string; notes: string }> {
    for (let i = 1; i <= 7; i++) {
      const date = this._offsetDate(today, -i);
      const [chronicle, notes] = await Promise.all([
        this._readChronicle(repoPath, date),
        this._readNote(repoPath, date),
      ]);
      if (chronicle.trim() || notes.trim()) return { date, chronicle, notes };
    }
    const date = this._offsetDate(today, -1);
    return { date, chronicle: "", notes: "" };
  }

  private async _readChronicle(
    repoPath: string,
    date: string,
  ): Promise<string> {
    const path = `${repoPath.replace(/\/+$/, "")}/chronicles/${date}.md`;
    if (!(await this._fsRepo.pathExists(path))) return "";
    return this._fsRepo.readFile(path);
  }

  private async _readNote(repoPath: string, date: string): Promise<string> {
    const path = `${repoPath.replace(/\/+$/, "")}/chronicles/notes/${date}.md`;
    if (!(await this._fsRepo.pathExists(path))) return "";
    return this._fsRepo.readFile(path);
  }

  private async _readQueue(repoPath: string): Promise<string> {
    const path = `${repoPath.replace(/\/+$/, "")}/${QUEUE_RELATIVE_PATH}`;
    if (!(await this._fsRepo.pathExists(path))) return "";
    return this._fsRepo.readFile(path);
  }

  /** Return a YYYY-MM-DD string offset by `days` from the given date. */
  private _offsetDate(from: string, days: number): string {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
