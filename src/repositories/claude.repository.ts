import { injectable } from "inversify";
import { ipcInvoke, IPC } from "../ipc";
import type { ClaudeReply } from "../types";

/**
 * Resource-access seam for the Claude API. Wraps the credential-bearing Rust
 * command via Tauri `invoke` (ADR-0003) — `ANTHROPIC_API_KEY` never enters the
 * webview. No business logic: the service builds the request body and picks the
 * model; this repository just transports it across the IPC boundary.
 */
export interface IClaudeRepository {
  /**
   * Invoke Claude with a pre-built Anthropic Messages request body (JSON string
   * including `model`, `max_tokens`, and `messages`). Returns reply text + usage.
   */
  invoke(args: { bodyJson: string }): Promise<ClaudeReply>;
}

@injectable()
export class ClaudeRepository implements IClaudeRepository {
  /** @inheritDoc */
  async invoke(args: { bodyJson: string }): Promise<ClaudeReply> {
    return ipcInvoke<ClaudeReply>(IPC.claudeInvoke, {
      bodyJson: args.bodyJson,
    });
  }
}
