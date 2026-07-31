/**
 * InversifyJS injection tokens for Wayfinder.
 *
 * Uses `Symbol.for` (the global symbol registry) so the same symbol is returned
 * across module instances — matters when the container and the class under test
 * load from different module instances (e.g. in Jest with require).
 *
 * The token — not the interface — is the runtime injection key.
 */
export const WAYFINDER_TOKENS = {
  // Handlers
  AppHandler: Symbol.for("AppHandler"),

  // Services
  WorkspaceService: Symbol.for("WorkspaceService"),
  NotesService: Symbol.for("NotesService"),
  ChatService: Symbol.for("ChatService"),
  KnowledgeService: Symbol.for("KnowledgeService"),
  QueueService: Symbol.for("QueueService"),
  ConfigRepository: Symbol.for("ConfigRepository"),
  StandupService: Symbol.for("StandupService"),

  // Repositories (thin wrappers over the Rust transport layer)
  GitRepository: Symbol.for("GitRepository"),
  ChronicleFsRepository: Symbol.for("ChronicleFsRepository"),
  ClockRepository: Symbol.for("ClockRepository"),
  ClaudeRepository: Symbol.for("ClaudeRepository"),
} as const;
