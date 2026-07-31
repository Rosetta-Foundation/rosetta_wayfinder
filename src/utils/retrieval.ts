import type { KnowledgeChunk, ScoredChunk } from "../types";

/**
 * Pure retrieval helpers for org-knowledge query (PRD-0010 Phase 2).
 *
 * At the current corpus size (~30 markdown files) lexical retrieval is the right
 * tool — chunk docs by heading, score chunks by query-term overlap, take the
 * top-N. No embeddings, no vector store, no extra model calls. Embeddings become
 * worthwhile only when the corpus outgrows what keyword scoring handles; that is
 * a deliberate fast-follow, not a Phase-1 need.
 */

/** Split a term string into lowercased word tokens (length ≥ 2). */
const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

/** Common words that shouldn't drive relevance. */
const STOP = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "any",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "what",
  "when",
  "how",
  "why",
  "who",
  "is",
  "of",
  "to",
  "in",
  "on",
  "it",
  "we",
  "do",
  "does",
  "this",
  "that",
  "with",
  "from",
  "about",
  "into",
  "a",
  "an",
  "as",
  "at",
  "be",
  "by",
  "or",
  "so",
]);

/**
 * Chunk a markdown document into sections keyed by heading. Content before the
 * first heading is attached to a synthetic chunk titled from the file.
 */
export const chunkMarkdown = (
  markdown: string,
  path: string,
  relativePath: string,
): KnowledgeChunk[] => {
  const lines = markdown.split("\n");
  const chunks: KnowledgeChunk[] = [];
  const fileTitle = relativePath.split("/").pop() ?? relativePath;

  let heading = fileTitle;
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) chunks.push({ path, relativePath, heading, text });
    buf = [];
  };

  for (const line of lines) {
    const m = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (m) {
      flush();
      heading = m[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks;
};

/**
 * Score a chunk against query tokens: term-frequency overlap, with a bonus when
 * a query term appears in the heading (headings are strong topical signals).
 */
export const scoreChunk = (
  chunk: KnowledgeChunk,
  queryTokens: string[],
): number => {
  if (queryTokens.length === 0) return 0;
  const bodyTokens = tokenize(chunk.text);
  const headingTokens = new Set(tokenize(chunk.heading));
  const bodyCounts = new Map<string, number>();
  for (const t of bodyTokens) bodyCounts.set(t, (bodyCounts.get(t) ?? 0) + 1);

  let score = 0;
  for (const q of queryTokens) {
    score += bodyCounts.get(q) ?? 0;
    if (headingTokens.has(q)) score += 5; // heading match is a strong signal
  }
  // Normalize slightly by chunk length so long chunks don't always win.
  return score / Math.sqrt(bodyTokens.length + 1);
};

/**
 * Rank all chunks against a query and return the top `limit`, best first.
 * Chunks scoring zero are excluded.
 */
export const topChunks = (
  chunks: KnowledgeChunk[],
  query: string,
  limit = 6,
): ScoredChunk[] => {
  const queryTokens = tokenize(query).filter((t) => !STOP.has(t));
  return chunks
    .map((c) => ({ ...c, score: scoreChunk(c, queryTokens) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
