import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import { INotesService, NotesService } from "../services/notes.service";
import { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import { IGitRepository } from "../repositories/git.repository";
import { IClockRepository } from "../repositories/clock.repository";

/**
 * Tests the NotesService business logic with mocked repositories. The clock is
 * mocked so date-derived paths are deterministic (the reason wall-clock time
 * lives behind a repository).
 */
describe("NotesService", () => {
  let container: Container;
  let service: INotesService;
  let mockFs: jest.Mocked<IChronicleFsRepository>;
  let mockGit: jest.Mocked<IGitRepository>;
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
    mockGit = {
      isRepo: jest.fn(),
      init: jest.fn(),
      commitAll: jest.fn(),
      log: jest.fn(),
    };
    mockClock = {
      today: jest.fn().mockReturnValue("2026-07-24"),
      now: jest.fn().mockReturnValue("2026-07-24T10:00:00.000Z"),
    };

    container = new Container();
    container
      .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
      .toConstantValue(mockFs);
    container
      .bind<IGitRepository>(WAYFINDER_TOKENS.GitRepository)
      .toConstantValue(mockGit);
    container
      .bind<IClockRepository>(WAYFINDER_TOKENS.ClockRepository)
      .toConstantValue(mockClock);
    container
      .bind<INotesService>(WAYFINDER_TOKENS.NotesService)
      .to(NotesService);
    service = container.get<INotesService>(WAYFINDER_TOKENS.NotesService);
  });

  describe("readNote / readToday", () => {
    it("returns empty string when the note does not exist", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      await expect(service.readNote("/repo", "2026-07-24")).resolves.toBe("");
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it("reads the note contents when it exists", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue("# my note");
      await expect(service.readNote("/repo", "2026-07-24")).resolves.toBe(
        "# my note",
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        "/repo/chronicles/notes/2026-07-24.md",
      );
    });

    it("readToday uses the clock date", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      await service.readToday("/repo");
      expect(mockClock.today).toHaveBeenCalled();
      expect(mockFs.pathExists).toHaveBeenCalledWith(
        "/repo/chronicles/notes/2026-07-24.md",
      );
    });
  });

  describe("appendEntry", () => {
    beforeEach(() => {
      mockGit.commitAll.mockResolvedValue("deadbeef");
    });

    it("writes a timestamped entry to the dated note path", async () => {
      mockFs.pathExists.mockResolvedValue(false); // no existing note yet
      await service.appendEntry("/repo", "hello");
      const [path, contents] = mockFs.writeFile.mock.calls[0];
      expect(path).toBe("/repo/chronicles/notes/2026-07-24.md");
      expect(contents).toContain("hello");
      // timestamp heading from clock.now()
      expect(contents).toContain("### 2026-07-24T10:00:00.000Z");
    });

    it("appends to an existing note instead of overwriting it", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(
        "### 2026-07-24T08:00:00.000Z\n\nearlier thought\n",
      );

      await service.appendEntry("/repo", "new thought");

      const contents = mockFs.writeFile.mock.calls[0][1] as string;
      // both the prior entry and the new one survive
      expect(contents).toContain("earlier thought");
      expect(contents).toContain("new thought");
      // prior content comes before the appended entry
      expect(contents.indexOf("earlier thought")).toBeLessThan(
        contents.indexOf("new thought"),
      );
    });

    it("ensures the notes directory exists before writing", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      await service.appendEntry("/repo", "hello");
      expect(mockFs.ensureDir).toHaveBeenCalledWith("/repo/chronicles/notes");
    });

    it("auto-commits with a formulaic note-save message", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      await service.appendEntry("/repo", "hello");
      expect(mockGit.commitAll).toHaveBeenCalledWith(
        "/repo",
        "note-save: 2026-07-24",
      );
    });

    it("returns date, relative path, sha, and the full updated note", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      const result = await service.appendEntry("/repo", "hello");
      expect(result.date).toBe("2026-07-24");
      expect(result.relativePath).toBe("chronicles/notes/2026-07-24.md");
      expect(result.sha).toBe("deadbeef");
      expect(result.note).toContain("hello");
    });

    it("trims the entry body", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      await service.appendEntry("/repo", "   spaced   ");
      const contents = mockFs.writeFile.mock.calls[0][1] as string;
      expect(contents).toContain("\n\nspaced\n");
    });
  });
});
