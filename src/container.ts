import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "./tokens";
import { IAppHandler, AppHandler } from "./handlers/app.handler";
import {
  IWorkspaceService,
  WorkspaceService,
} from "./services/workspace.service";
import { INotesService, NotesService } from "./services/notes.service";
import { IChatService, ChatService } from "./services/chat.service";
import {
  IKnowledgeService,
  KnowledgeService,
} from "./services/knowledge.service";
import { IQueueService, QueueService } from "./services/queue.service";
import { IStandupService, StandupService } from "./services/standup.service";
import {
  IConfigRepository,
  ConfigRepository,
} from "./repositories/config.repository";
import { IGitRepository, GitRepository } from "./repositories/git.repository";
import {
  IChronicleFsRepository,
  ChronicleFsRepository,
} from "./repositories/chronicle-fs.repository";
import {
  IClockRepository,
  ClockRepository,
} from "./repositories/clock.repository";
import {
  IClaudeRepository,
  ClaudeRepository,
} from "./repositories/claude.repository";

/**
 * Composition root. Wires the InversifyJS container and exposes a factory for
 * the root handler. No business logic lives here (HSR standard).
 */
export const buildContainer = (): Container => {
  const container = new Container();

  // Repositories (thin wrappers over the Rust transport layer)
  container
    .bind<IGitRepository>(WAYFINDER_TOKENS.GitRepository)
    .to(GitRepository);
  container
    .bind<IChronicleFsRepository>(WAYFINDER_TOKENS.ChronicleFsRepository)
    .to(ChronicleFsRepository);
  container
    .bind<IClockRepository>(WAYFINDER_TOKENS.ClockRepository)
    .to(ClockRepository);
  container
    .bind<IClaudeRepository>(WAYFINDER_TOKENS.ClaudeRepository)
    .to(ClaudeRepository);
  container
    .bind<IConfigRepository>(WAYFINDER_TOKENS.ConfigRepository)
    .to(ConfigRepository);

  // Services
  container
    .bind<IWorkspaceService>(WAYFINDER_TOKENS.WorkspaceService)
    .to(WorkspaceService);
  container.bind<INotesService>(WAYFINDER_TOKENS.NotesService).to(NotesService);
  container.bind<IChatService>(WAYFINDER_TOKENS.ChatService).to(ChatService);
  container
    .bind<IKnowledgeService>(WAYFINDER_TOKENS.KnowledgeService)
    .to(KnowledgeService);
  container.bind<IQueueService>(WAYFINDER_TOKENS.QueueService).to(QueueService);
  container
    .bind<IStandupService>(WAYFINDER_TOKENS.StandupService)
    .to(StandupService);

  // Handlers
  container.bind<IAppHandler>(WAYFINDER_TOKENS.AppHandler).to(AppHandler);

  return container;
};

/** Resolve the root App handler from a fresh container. */
export const getAppHandler = (): IAppHandler => {
  return buildContainer().get<IAppHandler>(WAYFINDER_TOKENS.AppHandler);
};
