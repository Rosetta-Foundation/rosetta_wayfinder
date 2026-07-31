import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import {
  IWorkspaceService,
  WorkspaceService,
} from "../services/workspace.service";
import { IGitRepository } from "../repositories/git.repository";
import { IChronicleFsRepository } from "../repositories/chronicle-fs.repository";
import { IConfigRepository } from "../repositories/config.repository";
import { LedgerEntry } from "../types";

/**
 * Tests the WorkspaceService business logic with mocked repositories, per the
 * Rosetta DI testing convention: fresh container, jest.fn() mocks bound via
 * toConstantValue, real class under test bound via .to, then container.get.
 */
describe("WorkspaceService", () => {
  let container: Container;
  let service: IWorkspaceService;
  let mockGit: jest.Mocked<IGitRepository>;
  let mockFs: jest.Mocked<IChronicleFsRepository>;
  let mockConfig: jest.Mocked<IConfigRepository>;

  beforeEach(() => {
    mockGit = {
      isRepo: jest.fn(),
      init: jest.fn(),
      commitAll: jest.fn(),
      log: jest.fn(),
    };
    mockFs = {
      defaultChroniclePath: jest.fn(),
      pathExists: jest.fn(),
      ensureDir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      listMarkdown: jest.fn(),
    };
    mockConfig = {
      load: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue(undefined),
    };

    container = new Container();
    container
      .bind<IGitRepository>(WAYFINDER_TOKENS.GitRepository)
      .toConstantValue(mockGit);
    container
      .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
      .toConstantValue(mockFs);
    container
      .bind<IConfigRepository>(WAYFINDER_TOKENS.ConfigRepository)
      .toConstantValue(mockConfig);
    container
      .bind<IWorkspaceService>(WAYFINDER_TOKENS.WorkspaceService)
      .to(WorkspaceService);
    service = container.get<IWorkspaceService>(
      WAYFINDER_TOKENS.WorkspaceService,
    );
  });

  describe("initWorkspace", () => {
    it("resolves the default path when none is provided and no config saved", async () => {
      mockConfig.load.mockResolvedValue({});
      mockFs.defaultChroniclePath.mockResolvedValue(
        "/home/u/Wayfinder/chronicle",
      );
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockGit.commitAll.mockResolvedValue("abc123");

      const result = await service.initWorkspace();

      expect(mockFs.defaultChroniclePath).toHaveBeenCalled();
      expect(result.repoPath).toBe("/home/u/Wayfinder/chronicle");
    });

    it("uses the saved config path when no explicit path is provided", async () => {
      mockConfig.load.mockResolvedValue({ chroniclePath: "/saved/chronicle" });
      mockFs.pathExists.mockResolvedValue(true);
      mockGit.isRepo.mockResolvedValue(true);

      const result = await service.initWorkspace();

      expect(mockFs.defaultChroniclePath).not.toHaveBeenCalled();
      expect(result.repoPath).toBe("/saved/chronicle");
    });

    it("uses the supplied path without resolving the default", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockGit.commitAll.mockResolvedValue("abc123");

      const result = await service.initWorkspace("/custom/path");

      expect(mockFs.defaultChroniclePath).not.toHaveBeenCalled();
      expect(result.repoPath).toBe("/custom/path");
    });

    it("creates the canonical directory layout", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockGit.commitAll.mockResolvedValue("abc123");

      await service.initWorkspace("/repo");

      expect(mockFs.ensureDir).toHaveBeenCalledWith("/repo/chronicles");
      expect(mockFs.ensureDir).toHaveBeenCalledWith("/repo/chronicles/notes");
    });

    it("initializes git and seeds a root commit when not already a repo", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockGit.commitAll.mockResolvedValue("root123");

      await service.initWorkspace("/repo");

      expect(mockGit.init).toHaveBeenCalledWith("/repo");
      expect(mockGit.commitAll).toHaveBeenCalledWith(
        "/repo",
        expect.stringContaining("init"),
      );
    });

    it("does not re-init or re-commit when already a repo", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockGit.isRepo.mockResolvedValue(true);

      const result = await service.initWorkspace("/repo");

      expect(mockGit.init).not.toHaveBeenCalled();
      expect(mockGit.commitAll).not.toHaveBeenCalled();
      expect(result.gitReady).toBe(true);
    });

    it("reports created=false when the path already existed", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockGit.isRepo.mockResolvedValue(true);

      const result = await service.initWorkspace("/repo");

      expect(result.created).toBe(false);
    });

    it("reports created=true when the path did not exist", async () => {
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockGit.commitAll.mockResolvedValue("root123");

      const result = await service.initWorkspace("/repo");

      expect(result.created).toBe(true);
    });

    it("does not double-init when called concurrently (StrictMode guard)", async () => {
      // Both callers race before the repo exists; the in-flight guard must
      // collapse them into a single provisioning run — one init, one commit.
      mockFs.pathExists.mockResolvedValue(false);
      mockGit.isRepo.mockResolvedValue(false);
      mockGit.commitAll.mockResolvedValue("root123");

      const [a, b] = await Promise.all([
        service.initWorkspace("/repo"),
        service.initWorkspace("/repo"),
      ]);

      expect(mockGit.init).toHaveBeenCalledTimes(1);
      expect(mockGit.commitAll).toHaveBeenCalledTimes(1);
      expect(a).toBe(b); // same shared promise result
    });

    it("runs a fresh init after a prior call settles", async () => {
      // The guard is per-in-flight, not a permanent cache: a later call re-runs.
      mockFs.pathExists.mockResolvedValue(true);
      mockGit.isRepo.mockResolvedValue(true);

      await service.initWorkspace("/repo");
      await service.initWorkspace("/repo");

      // pathExists probed on each settled call (2), proving no permanent memoization.
      expect(mockFs.pathExists).toHaveBeenCalledTimes(2);
    });
  });

  describe("changeChronicle", () => {
    it("saves the new path to config and returns the provisioned workspace", async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockGit.isRepo.mockResolvedValue(true);

      const result = await service.changeChronicle("/new/chronicle");

      expect(mockConfig.save).toHaveBeenCalledWith({
        chroniclePath: "/new/chronicle",
      });
      expect(result.repoPath).toBe("/new/chronicle");
    });
  });

  describe("history", () => {
    it("returns ledger entries from the git repo", async () => {
      const entries: LedgerEntry[] = [
        {
          sha: "a1",
          message: "note-save: 2026-07-24",
          timestamp: "2026-07-24T10:00:00Z",
        },
      ];
      mockGit.log.mockResolvedValue(entries);

      const result = await service.history("/repo");

      expect(result).toEqual(entries);
      expect(mockGit.log).toHaveBeenCalledWith("/repo", 50);
    });

    it("passes a custom limit through to the repo", async () => {
      mockGit.log.mockResolvedValue([]);

      await service.history("/repo", 5);

      expect(mockGit.log).toHaveBeenCalledWith("/repo", 5);
    });
  });
});
