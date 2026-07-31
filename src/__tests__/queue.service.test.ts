import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import { IQueueService, QueueService } from "../services/queue.service";
import { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import { IGitRepository } from "../repositories/git.repository";

const SAMPLE_QUEUE = `# Work Queue

## Active
- [ ] Ship the demo [due:2026-09-15]

## Next Up
<!-- empty -->

## Inbox
- [x] Write PRD-0011
`;

describe("QueueService", () => {
  let container: Container;
  let service: IQueueService;
  let mockFs: jest.Mocked<IChronicleFsRepository>;
  let mockGit: jest.Mocked<IGitRepository>;

  beforeEach(() => {
    mockFs = {
      defaultChroniclePath: jest.fn(),
      pathExists: jest.fn(),
      ensureDir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      listMarkdown: jest.fn(),
    };
    mockGit = {
      isRepo: jest.fn(),
      init: jest.fn(),
      commitAll: jest.fn().mockResolvedValue("abc1234"),
      log: jest.fn(),
    };

    container = new Container();
    container
      .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
      .toConstantValue(mockFs);
    container
      .bind<IGitRepository>(WAYFINDER_TOKENS.GitRepository)
      .toConstantValue(mockGit);
    container
      .bind<IQueueService>(WAYFINDER_TOKENS.QueueService)
      .to(QueueService);
    service = container.get<IQueueService>(WAYFINDER_TOKENS.QueueService);
  });

  describe("loadQueue", () => {
    it("reads and parses the queue when it exists", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(SAMPLE_QUEUE);

      const state = await service.loadQueue("/repo");

      expect(mockFs.readFile).toHaveBeenCalledWith("/repo/chronicles/queue.md");
      expect(state.sections[0].title).toBe("Active");
      expect(state.sections[0].items[0].text).toBe("Ship the demo");
    });

    it("creates queue.md with default content when missing", async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const state = await service.loadQueue("/repo");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/repo/chronicles/queue.md",
        expect.stringContaining("## Active"),
      );
      expect(mockGit.commitAll).toHaveBeenCalledWith(
        "/repo",
        "queue-edit: initialise queue",
      );
      expect(state.sections.map((s) => s.title)).toContain("Active");
    });
  });

  describe("saveQueue", () => {
    it("writes the raw content and auto-commits", async () => {
      await service.saveQueue("/repo", SAMPLE_QUEUE);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/repo/chronicles/queue.md",
        SAMPLE_QUEUE,
      );
      expect(mockGit.commitAll).toHaveBeenCalledWith(
        "/repo",
        "queue-edit: update queue",
      );
    });
  });

  describe("toggleItem", () => {
    it("toggles a checkbox and returns the updated state", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(SAMPLE_QUEUE);

      const state = await service.toggleItem(
        "/repo",
        "Active",
        "Ship the demo",
      );

      // The item should now be checked.
      expect(state.sections[0].items[0].checked).toBe(true);

      // The written content reflects the toggle.
      const written = mockFs.writeFile.mock.calls[0][1] as string;
      expect(written).toContain("- [x] Ship the demo");
    });

    it("unchecks a checked item", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(SAMPLE_QUEUE);

      const state = await service.toggleItem(
        "/repo",
        "Inbox",
        "Write PRD-0011",
      );

      expect(state.sections[2].items[0].checked).toBe(false);
    });
  });
});
