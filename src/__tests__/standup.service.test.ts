import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import { IStandupService, StandupService } from "../services/standup.service";
import { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import { IClaudeRepository } from "../repositories/claude.repository";
import { IClockRepository } from "../repositories/clock.repository";

const YESTERDAY_NOTES =
  "### 2026-07-25T09:00:00Z\n\nFinished the queue GUI and opened PR #14.";
const YESTERDAY_CHRONICLE =
  "# Daily Chronicle\n\n## Work Completed\n\n- feat: queue GUI (#14)";
const QUEUE_CONTENT = `# Work Queue\n\n## Active\n- [ ] Ship standup feature\n\n## Next Up\n- [ ] Demo polish\n\n## Inbox\n`;

describe("StandupService", () => {
  let container: Container;
  let service: IStandupService;
  let mockFs: jest.Mocked<IChronicleFsRepository>;
  let mockClaude: jest.Mocked<IClaudeRepository>;
  let mockClock: jest.Mocked<IClockRepository>;

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
        text: "Yesterday: Finished queue GUI.\nToday: Building standup feature.\nBlockers: None.",
        input_tokens: 200,
        output_tokens: 30,
        model: "claude-sonnet-5",
      }),
    };
    mockClock = {
      today: jest.fn().mockReturnValue("2026-07-26"),
      now: jest.fn().mockReturnValue("2026-07-26T09:00:00.000Z"),
    };

    container = new Container();
    container
      .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
      .toConstantValue(mockFs);
    container
      .bind<IClaudeRepository>(WAYFINDER_TOKENS.ClaudeRepository)
      .toConstantValue(mockClaude);
    container
      .bind<IClockRepository>(WAYFINDER_TOKENS.ClockRepository)
      .toConstantValue(mockClock);
    container
      .bind<IStandupService>(WAYFINDER_TOKENS.StandupService)
      .to(StandupService);
    service = container.get<IStandupService>(WAYFINDER_TOKENS.StandupService);
  });

  it("finds the most recent prior session (chronicle or notes) within 7 days", async () => {
    // 2026-07-25 has no files, 2026-07-24 has a chronicle
    mockFs.pathExists.mockImplementation(async (p) => {
      if (p.includes("chronicles/2026-07-24")) return true;
      if (p.includes("queue.md")) return true;
      return false;
    });
    mockFs.readFile.mockImplementation(async (p) => {
      if (p.includes("chronicles/2026-07-24")) return YESTERDAY_CHRONICLE;
      if (p.includes("queue.md")) return QUEUE_CONTENT;
      return "";
    });

    await service.generate("/repo");

    expect(mockFs.pathExists).toHaveBeenCalledWith(
      expect.stringContaining("2026-07-25"),
    );
    expect(mockFs.pathExists).toHaveBeenCalledWith(
      expect.stringContaining("2026-07-24"),
    );
  });

  it("includes both daily chronicle and notes in the Claude prompt", async () => {
    mockFs.pathExists.mockImplementation(
      async (p) =>
        p.includes("chronicles/2026-07-25") ||
        p.includes("notes/2026-07-25") ||
        p.includes("queue.md"),
    );
    mockFs.readFile.mockImplementation(async (p) => {
      if (p.includes("chronicles/2026-07-25.md")) return YESTERDAY_CHRONICLE;
      if (p.includes("notes/2026-07-25")) return YESTERDAY_NOTES;
      if (p.includes("queue.md")) return QUEUE_CONTENT;
      return "";
    });

    await service.generate("/repo");

    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.messages[0].content).toContain("feat: queue GUI");
    expect(body.messages[0].content).toContain("Finished the queue GUI");
  });

  it("includes queue items in the Claude prompt", async () => {
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.readFile.mockImplementation(async (p) => {
      if (p.includes("queue.md")) return QUEUE_CONTENT;
      return "";
    });

    await service.generate("/repo");

    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.messages[0].content).toContain("Ship standup feature");
  });

  it("handles no prior activity within 7 days gracefully", async () => {
    // Only queue.md exists, no chronicle or note files at all
    mockFs.pathExists.mockImplementation(async (p) => p.includes("queue.md"));
    mockFs.readFile.mockImplementation(async (p) =>
      p.includes("queue.md") ? QUEUE_CONTENT : "",
    );

    await service.generate("/repo");

    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.messages[0].content).toContain(
      "No activity or notes recorded for this date",
    );
  });

  it("returns the summary, model, and usage from Claude", async () => {
    mockFs.pathExists.mockResolvedValue(false);

    const result = await service.generate("/repo");

    expect(result.summary).toContain("Yesterday: Finished queue GUI");
    expect(result.model).toBe("claude-sonnet-5");
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 30 });
  });
});
