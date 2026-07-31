import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import type { IClaudeRepository } from "../repositories/claude.repository";
import type {
  Citation,
  KnowledgeAnswer,
  KnowledgeChunk,
  ModelChoice,
  ScoredChunk,
} from "../types";
import { chunkMarkdown, topChunks } from "../utils/retrieval";
import { DEFAULT_MAX_TOKENS, resolveModelId } from "../config/claude";

/**
 * Business logic for querying org knowledge (PRD-0010 Phase 2): retrieve
 * relevant doc sections, ground a Claude answer in them, and return the answer
 * with citations. Composes the filesystem repo (to read the org repo) and the
 * Claude repo (to answer) — it does NOT call ChatService, keeping the one-way
 * Handler→Service→Repository rule intact.
 *
 * Retrieval is lexical (see utils/retrieval); embeddings are a deliberate
 * fast-follow for when the corpus grows.
 *
 * When `chronicleRepoPath` is supplied, chunks from the personal chronicle are
 * merged with org chunks before retrieval so questions like "what were my action
 * items from the last IPM?" are answered from the user's own notes.
 */
export interface IKnowledgeService {
  /**
   * Answer `question` from the org knowledge repo at `orgRepoPath`, optionally
   * also searching the user's personal chronicle at `chronicleRepoPath`.
   * Returns the answer and its citations.
   */
  ask(
    orgRepoPath: string,
    question: string,
    model?: ModelChoice,
    chronicleRepoPath?: string,
  ): Promise<KnowledgeAnswer>;
}

@injectable()
export class KnowledgeService implements IKnowledgeService {
  constructor(
    @inject(WAYFINDER_TOKENS.ChronicleFsRepository)
    private readonly _fsRepo: IChronicleFsRepository,
    @inject(WAYFINDER_TOKENS.ClaudeRepository)
    private readonly _claude: IClaudeRepository,
  ) {}

  /** @inheritDoc */
  async ask(
    orgRepoPath: string,
    question: string,
    model: ModelChoice = "auto",
    chronicleRepoPath?: string,
  ): Promise<KnowledgeAnswer> {
    const [orgChunks, chronicleChunks] = await Promise.all([
      this._loadChunks(orgRepoPath),
      chronicleRepoPath
        ? this._loadChunks(chronicleRepoPath)
        : Promise.resolve([]),
    ]);
    const allChunks = [...orgChunks, ...chronicleChunks];
    const top = topChunks(allChunks, question, 8);

    const hasOrg = top.some((c) => orgChunks.some((o) => o.path === c.path));
    const hasChronicle = top.some((c) =>
      chronicleChunks.some((ch) => ch.path === c.path),
    );

    if (top.length === 0) {
      const sources = chronicleRepoPath
        ? "the org knowledge base or your personal chronicle"
        : "the org knowledge base";
      return {
        answer: `I couldn't find anything in ${sources} related to that. Try rephrasing, or the topic may not be documented yet.`,
        citations: [],
        model: resolveModelId(model),
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    const bodyJson = JSON.stringify({
      model: resolveModelId(model),
      max_tokens: DEFAULT_MAX_TOKENS,
      system: this._systemPrompt(hasOrg, hasChronicle),
      messages: [{ role: "user", content: this._userPrompt(question, top) }],
    });

    const reply = await this._claude.invoke({ bodyJson });

    return {
      answer: reply.text,
      citations: this._citations(top),
      model: reply.model,
      usage: {
        inputTokens: reply.input_tokens,
        outputTokens: reply.output_tokens,
      },
    };
  }

  /** Read every markdown doc under the org repo and chunk it by heading. */
  private async _loadChunks(orgRepoPath: string): Promise<KnowledgeChunk[]> {
    const paths = await this._fsRepo.listMarkdown(orgRepoPath);
    const all: KnowledgeChunk[] = [];
    for (const abs of paths) {
      const rel = this._relativize(orgRepoPath, abs);
      const text = await this._fsRepo.readFile(abs);
      all.push(...chunkMarkdown(text, abs, rel));
    }
    return all;
  }

  /** The grounding instruction: answer only from context, cite sources. */
  private _systemPrompt(hasOrg: boolean, hasChronicle: boolean): string {
    const sources: string[] = [];
    if (hasOrg) sources.push("org knowledge base");
    if (hasChronicle)
      sources.push(
        "the user's personal chronicle (meeting notes, daily logs, and captured notes)",
      );
    const sourceDesc =
      sources.length > 0
        ? sources.join(" and ")
        : "the provided knowledge base";
    return [
      `You are Wayfinder, answering questions from ${sourceDesc}.`,
      "Answer ONLY from the provided context. If the context does not contain the answer,",
      "say so plainly. Be concise and specific. When referencing personal chronicle entries",
      "(notes/, chronicles/), summarise the relevant content directly.",
      "Cite source documents by their path and section when you use them.",
    ].join(" ");
  }

  /** Assemble the retrieved context + the question into one user message. */
  private _userPrompt(question: string, chunks: ScoredChunk[]): string {
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.relativePath} › ${c.heading}\n${c.text}`)
      .join("\n\n---\n\n");
    return `Context from the org knowledge base:\n\n${context}\n\n---\n\nQuestion: ${question}`;
  }

  /** De-duplicated citations for the retrieved sources. */
  private _citations(chunks: ScoredChunk[]): Citation[] {
    const seen = new Set<string>();
    const out: Citation[] = [];
    for (const c of chunks) {
      const key = `${c.relativePath}#${c.heading}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ relativePath: c.relativePath, heading: c.heading });
    }
    return out;
  }

  /** Best-effort repo-relative path for display. */
  private _relativize(root: string, abs: string): string {
    const trimmed = root.replace(/\/+$/, "");
    return abs.startsWith(trimmed) ? abs.slice(trimmed.length + 1) : abs;
  }
}
