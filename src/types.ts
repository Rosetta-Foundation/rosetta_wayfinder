/**
 * Boundary / DTO types for Wayfinder's frontend.
 *
 * These are the contract shared between the thin Rust transport layer (reached
 * via Tauri `invoke`), the repositories that wrap it, and the services that hold
 * business logic. Never duplicate these as local interfaces.
 *
 * Per ADR-0003, all business logic lives here in TypeScript under the
 * Handler / Service / Repository pattern; the Rust core only exposes primitive,
 * logic-free commands.
 */

/** The canonical directory layout of a chronicle repository. */
export const CHRONICLE_DIRS = ["chronicles", "chronicles/notes"] as const;

/** The queue file path, relative to the chronicle repo root. */
export const QUEUE_RELATIVE_PATH = "chronicles/queue.md";

// ─── App config ────────────────────────────────────────────────────────────────

/** Persisted user preferences (~/.wayfinder/config.json). */
export interface WayfinderConfig {
  /** Absolute path to the chronicle repo to use. Overrides the default. */
  chroniclePath?: string;
}

// ─── Standup ───────────────────────────────────────────────────────────────────

/** The result of a standup summary generation. */
export interface StandupResult {
  /** The generated standup text. */
  summary: string;
  /** The concrete model id that answered. */
  model: string;
  /** Token usage. */
  usage: { inputTokens: number; outputTokens: number };
}

// ─── Queue ─────────────────────────────────────────────────────────────────────

/** A single item in the work queue. */
export interface QueueItem {
  /** Display text (tags stripped). */
  text: string;
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** Parsed tag strings, e.g. `['prd:0006/1', 'due:2026-09-15']`. */
  tags: string[];
}

/** One named section of the queue (Active / Next Up / Inbox). */
export interface QueueSection {
  title: string;
  items: QueueItem[];
}

/** The full parsed queue, plus the raw content for round-trip writes. */
export interface QueueState {
  sections: QueueSection[];
  /** Full file content — used by the service to apply edits without re-serialising. */
  raw: string;
}

/** Result of the first-run workspace provisioning. */
export interface WorkspaceInit {
  /** Absolute path to the chronicle repository root. */
  repoPath: string;
  /** True when this run created the repository; false when it already existed. */
  created: boolean;
  /** True when a git repository is present at repoPath after init. */
  gitReady: boolean;
}

/** A single entry in the chronicle's commit history (the invisible ledger). */
export interface LedgerEntry {
  /** Full commit SHA. */
  sha: string;
  /** Commit message (the formulaic action summary). */
  message: string;
  /** ISO-8601 timestamp of the commit. */
  timestamp: string;
}

/** The kind of action that produced a ledger commit. */
export type LedgerAction =
  "note-save" | "queue-edit" | "conversation-end" | "init" | "sync" | "promote";

/** Result of appending a note entry. */
export interface NoteSaveResult {
  /** The date (YYYY-MM-DD) the note was filed under. */
  date: string;
  /** Repo-relative path the note was written to. */
  relativePath: string;
  /** SHA of the commit that captured the save. */
  sha: string;
  /** The full updated note text after the append (for refreshing the UI). */
  note: string;
}

// ─── AI chat (Claude API) ─────────────────────────────────────────────────────

/** A model the user can select. `auto` resolves to a sensible default. */
export type ModelChoice = "auto" | "sonnet" | "opus" | "haiku";

/** A single chat message in a conversation. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** The raw reply returned by the Claude transport command. */
export interface ClaudeReply {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
}

/** A chat turn's result surfaced to the UI, with usage for tracking. */
export interface ChatTurnResult {
  /** The assistant's reply text. */
  reply: string;
  /** The concrete model id that answered (after resolving `auto`). */
  model: string;
  /** Token usage for this turn. */
  usage: { inputTokens: number; outputTokens: number };
}

// ─── Org knowledge query (RAG) ─────────────────────────────────────────────────

/** A retrievable chunk of org knowledge (one section of a doc). */
export interface KnowledgeChunk {
  /** Absolute source file path. */
  path: string;
  /** Repo-relative source path, for display/citation. */
  relativePath: string;
  /** Section heading this chunk falls under (or the file title). */
  heading: string;
  /** The chunk's text. */
  text: string;
}

/** A retrieved chunk with its relevance score. */
export interface ScoredChunk extends KnowledgeChunk {
  /** Lexical relevance score for the query (higher = more relevant). */
  score: number;
}

/** A citation surfaced alongside an answer. */
export interface Citation {
  /** Repo-relative source path. */
  relativePath: string;
  /** Section heading cited. */
  heading: string;
}

/** The result of an org-knowledge query: answer + the evidence behind it. */
export interface KnowledgeAnswer {
  /** The synthesized answer text. */
  answer: string;
  /** The sources the answer was grounded in. */
  citations: Citation[];
  /** The concrete model id that answered. */
  model: string;
  /** Token usage for the answer. */
  usage: { inputTokens: number; outputTokens: number };
}
