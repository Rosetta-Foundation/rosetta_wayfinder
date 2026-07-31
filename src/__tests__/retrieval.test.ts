import { chunkMarkdown, scoreChunk, topChunks } from "../utils/retrieval";
import type { KnowledgeChunk } from "../types";

describe("chunkMarkdown", () => {
  it("splits a doc into chunks by heading", () => {
    const md = `# Title\n\nintro text\n\n## Section A\n\nalpha content\n\n## Section B\n\nbeta content`;
    const chunks = chunkMarkdown(md, "/abs/doc.md", "doc.md");
    const headings = chunks.map((c) => c.heading);
    expect(headings).toEqual(["Title", "Section A", "Section B"]);
    expect(chunks[1].text).toContain("alpha content");
  });

  it("carries the path and relativePath onto every chunk", () => {
    const md = `## Only\n\nbody`;
    const [chunk] = chunkMarkdown(md, "/abs/x.md", "sub/x.md");
    expect(chunk.path).toBe("/abs/x.md");
    expect(chunk.relativePath).toBe("sub/x.md");
  });

  it("drops empty sections", () => {
    const md = `## Empty\n\n## Full\n\ncontent`;
    const chunks = chunkMarkdown(md, "/a.md", "a.md");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe("Full");
  });
});

describe("scoreChunk", () => {
  const chunk: KnowledgeChunk = {
    path: "/a.md",
    relativePath: "a.md",
    heading: "Quota Limit Resolution",
    text: "The quota limit was resolved by adjusting the field mapping.",
  };

  it("scores higher when query terms appear in the heading", () => {
    const withHeadingHit = scoreChunk(chunk, ["quota"]);
    const bodyOnly = scoreChunk(chunk, ["mapping"]);
    expect(withHeadingHit).toBeGreaterThan(bodyOnly);
  });

  it("returns 0 for no overlap", () => {
    expect(scoreChunk(chunk, ["kubernetes"])).toBe(0);
  });

  it("returns 0 for an empty query", () => {
    expect(scoreChunk(chunk, [])).toBe(0);
  });
});

describe("topChunks", () => {
  const chunks: KnowledgeChunk[] = [
    {
      path: "/a.md",
      relativePath: "a.md",
      heading: "Auth",
      text: "okta and entra federation",
    },
    {
      path: "/b.md",
      relativePath: "b.md",
      heading: "Quota",
      text: "quota limit resolution quota quota",
    },
    {
      path: "/c.md",
      relativePath: "c.md",
      heading: "Misc",
      text: "unrelated content here",
    },
  ];

  it("ranks the most relevant chunk first", () => {
    const results = topChunks(chunks, "quota limit", 5);
    expect(results[0].relativePath).toBe("b.md");
  });

  it("excludes zero-scoring chunks", () => {
    const results = topChunks(chunks, "quota", 5);
    expect(results.some((c) => c.relativePath === "c.md")).toBe(false);
  });

  it("respects the limit", () => {
    const results = topChunks(chunks, "okta quota unrelated", 1);
    expect(results).toHaveLength(1);
  });

  it("ignores stopwords in the query", () => {
    // "what is the" are all stopwords; only "auth" should drive the match.
    const results = topChunks(chunks, "what is the auth", 5);
    expect(results[0].relativePath).toBe("a.md");
  });
});
