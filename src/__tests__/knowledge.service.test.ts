import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import {
  IKnowledgeService,
  KnowledgeService,
} from "../services/knowledge.service";
import { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import { IClaudeRepository } from "../repositories/claude.repository";

/**
 * Tests the KnowledgeService RAG orchestration with mocked fs + Claude repos:
 * retrieval feeds the prompt, the answer carries citations, and the no-match
 * path short-circuits without calling Claude.
 */
describe("KnowledgeService", () => {
  let container: Container;
  let service: IKnowledgeService;
  let mockFs: jest.Mocked<IChronicleFsRepository>;
  let mockClaude: jest.Mocked<IClaudeRepository>;

  beforeEach(() => {
    mockFs = {
      defaultChroniclePath: jest.fn(),
      pathExists: jest.fn(),
      ensureDir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      listMarkdown: jest.fn(),
    };
    mockClaude = {
      invoke: jest.fn().mockResolvedValue({
        text: "The quota limit work is complete.",
        input_tokens: 100,
        output_tokens: 20,
        model: "claude-sonnet-5",
      }),
    };

    container = new Container();
    container
      .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
      .toConstantValue(mockFs);
    container
      .bind<IClaudeRepository>(WAYFINDER_TOKENS.ClaudeRepository)
      .toConstantValue(mockClaude);
    container
      .bind<IKnowledgeService>(WAYFINDER_TOKENS.KnowledgeService)
      .to(KnowledgeService);
    service = container.get<IKnowledgeService>(
      WAYFINDER_TOKENS.KnowledgeService,
    );
  });

  it("reads every markdown doc under the org repo", async () => {
    mockFs.listMarkdown.mockResolvedValue(["/org/a.md", "/org/b.md"]);
    mockFs.readFile.mockResolvedValue("## Quota\n\nquota limit resolution");

    await service.ask("/org", "quota limit");

    expect(mockFs.listMarkdown).toHaveBeenCalledWith("/org");
    expect(mockFs.readFile).toHaveBeenCalledWith("/org/a.md");
    expect(mockFs.readFile).toHaveBeenCalledWith("/org/b.md");
  });

  it("grounds the prompt in retrieved context and returns citations", async () => {
    mockFs.listMarkdown.mockResolvedValue(["/org/product/PRD-0099.md"]);
    mockFs.readFile.mockResolvedValue(
      "## Quota Limit\n\nthe quota limit work shipped",
    );

    const result = await service.ask(
      "/org",
      "what is the status of the quota limit work",
    );

    // Claude was invoked with the retrieved context in the body
    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.messages[0].content).toContain("quota limit work shipped");
    expect(body.system).toContain("ONLY from the provided context");

    // Answer + citation surfaced
    expect(result.answer).toContain("quota limit work is complete");
    expect(result.citations[0].relativePath).toBe("product/PRD-0099.md");
    expect(result.citations[0].heading).toBe("Quota Limit");
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 });
  });

  it("short-circuits without calling Claude when nothing matches", async () => {
    mockFs.listMarkdown.mockResolvedValue(["/org/a.md"]);
    mockFs.readFile.mockResolvedValue("## Auth\n\nokta entra federation");

    const result = await service.ask("/org", "kubernetes helm charts");

    expect(mockClaude.invoke).not.toHaveBeenCalled();
    expect(result.citations).toEqual([]);
    expect(result.answer).toMatch(/couldn't find/i);
  });

  it("relativizes absolute paths against the org root for citations", async () => {
    mockFs.listMarkdown.mockResolvedValue(["/org/architecture/ADR-0003.md"]);
    mockFs.readFile.mockResolvedValue(
      "## Tauri\n\nthin rust core tauri decision",
    );

    const result = await service.ask("/org", "tauri decision");

    expect(result.citations[0].relativePath).toBe("architecture/ADR-0003.md");
  });
});
