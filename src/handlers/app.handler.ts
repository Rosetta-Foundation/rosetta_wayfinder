import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IWorkspaceService } from "../services/workspace.service";
import type { INotesService } from "../services/notes.service";
import type { IChatService } from "../services/chat.service";
import type { IKnowledgeService } from "../services/knowledge.service";
import type { IQueueService } from "../services/queue.service";
import type { IStandupService } from "../services/standup.service";
import type {
  ChatMessage,
  ChatTurnResult,
  KnowledgeAnswer,
  LedgerEntry,
  ModelChoice,
  NoteSaveResult,
  QueueState,
  StandupResult,
  WorkspaceInit,
} from "../types";

/**
 * Entry point for the app's boot sequence and note operations. Parses no
 * external event here (the UI calls these directly), dispatches to the
 * appropriate service, and returns the result. No business logic (ADR-0003 / HSR).
 */
export interface IAppHandler {
  /** Run first-run provisioning and return the workspace state. */
  bootstrap(repoPath?: string): Promise<WorkspaceInit>;
  /** Fetch the ledger history for display. */
  getHistory(repoPath: string, limit?: number): Promise<LedgerEntry[]>;
  /** Load today's accumulated note text for display. */
  loadTodayNote(repoPath: string): Promise<string>;
  /** Append a timestamped entry to today's note; returns the updated note. */
  appendNote(repoPath: string, entry: string): Promise<NoteSaveResult>;
  /** Send a chat message through Claude and return the assistant reply. */
  sendChat(
    history: ChatMessage[],
    prompt: string,
    model?: ModelChoice,
  ): Promise<ChatTurnResult>;
  /** Answer a question from the org knowledge repo and optionally the personal chronicle. */
  askKnowledge(
    orgRepoPath: string,
    question: string,
    model?: ModelChoice,
    chronicleRepoPath?: string,
  ): Promise<KnowledgeAnswer>;
  /** Generate a standup summary from the chronicle. */
  getStandup(repoPath: string, model?: ModelChoice): Promise<StandupResult>;
  /** Persist a new chronicle path and re-initialise the workspace. */
  changeChronicle(newPath: string): Promise<WorkspaceInit>;
  /** Load and parse the work queue. */
  loadQueue(repoPath: string): Promise<QueueState>;
  /** Persist raw queue content. */
  saveQueue(repoPath: string, raw: string): Promise<void>;
  /** Toggle a queue checkbox and persist. */
  toggleQueueItem(
    repoPath: string,
    sectionTitle: string,
    itemText: string,
  ): Promise<QueueState>;
}

@injectable()
export class AppHandler implements IAppHandler {
  constructor(
    @inject(WAYFINDER_TOKENS.WorkspaceService)
    private readonly _workspace: IWorkspaceService,
    @inject(WAYFINDER_TOKENS.NotesService)
    private readonly _notes: INotesService,
    @inject(WAYFINDER_TOKENS.ChatService)
    private readonly _chat: IChatService,
    @inject(WAYFINDER_TOKENS.KnowledgeService)
    private readonly _knowledge: IKnowledgeService,
    @inject(WAYFINDER_TOKENS.QueueService)
    private readonly _queue: IQueueService,
    @inject(WAYFINDER_TOKENS.StandupService)
    private readonly _standup: IStandupService,
  ) {}

  /** @inheritDoc */
  async bootstrap(repoPath?: string): Promise<WorkspaceInit> {
    return this._workspace.initWorkspace(repoPath);
  }

  /** @inheritDoc */
  async getHistory(repoPath: string, limit?: number): Promise<LedgerEntry[]> {
    return this._workspace.history(repoPath, limit);
  }

  /** @inheritDoc */
  async loadTodayNote(repoPath: string): Promise<string> {
    return this._notes.readToday(repoPath);
  }

  /** @inheritDoc */
  async appendNote(repoPath: string, entry: string): Promise<NoteSaveResult> {
    return this._notes.appendEntry(repoPath, entry);
  }

  /** @inheritDoc */
  async sendChat(
    history: ChatMessage[],
    prompt: string,
    model?: ModelChoice,
  ): Promise<ChatTurnResult> {
    return this._chat.send(history, prompt, model);
  }

  /** @inheritDoc */
  async askKnowledge(
    orgRepoPath: string,
    question: string,
    model?: ModelChoice,
    chronicleRepoPath?: string,
  ): Promise<KnowledgeAnswer> {
    return this._knowledge.ask(orgRepoPath, question, model, chronicleRepoPath);
  }

  /** @inheritDoc */
  async getStandup(
    repoPath: string,
    model?: ModelChoice,
  ): Promise<StandupResult> {
    return this._standup.generate(repoPath, model);
  }

  /** @inheritDoc */
  async changeChronicle(newPath: string): Promise<WorkspaceInit> {
    return this._workspace.changeChronicle(newPath);
  }

  /** @inheritDoc */
  async loadQueue(repoPath: string): Promise<QueueState> {
    return this._queue.loadQueue(repoPath);
  }

  /** @inheritDoc */
  async saveQueue(repoPath: string, raw: string): Promise<void> {
    await this._queue.saveQueue(repoPath, raw);
  }

  /** @inheritDoc */
  async toggleQueueItem(
    repoPath: string,
    sectionTitle: string,
    itemText: string,
  ): Promise<QueueState> {
    return this._queue.toggleItem(repoPath, sectionTitle, itemText);
  }
}
