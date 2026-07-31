import { inject, injectable } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import type { IClaudeRepository } from "../repositories/claude.repository";
import type { ChatMessage, ChatTurnResult, ModelChoice } from "../types";
import { DEFAULT_MAX_TOKENS, resolveModelId } from "../config/claude";

/**
 * Business logic for AI chat over the Claude API (PRD-0010 §3.3). Builds the
 * Anthropic Messages request body, resolves the user's model choice, and shapes
 * the reply + usage. All request/response shaping lives here in TypeScript; the
 * Rust command is only the credentialed transport (ADR-0003).
 */
export interface IChatService {
  /**
   * Send a conversation and return the assistant's reply. `history` is the full
   * prior exchange; `prompt` is the new user message.
   */
  send(
    history: ChatMessage[],
    prompt: string,
    model?: ModelChoice,
  ): Promise<ChatTurnResult>;
}

@injectable()
export class ChatService implements IChatService {
  constructor(
    @inject(WAYFINDER_TOKENS.ClaudeRepository)
    private readonly _claude: IClaudeRepository,
  ) {}

  /** @inheritDoc */
  async send(
    history: ChatMessage[],
    prompt: string,
    model: ModelChoice = "auto",
  ): Promise<ChatTurnResult> {
    const modelId = resolveModelId(model);
    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: prompt },
    ];

    const bodyJson = JSON.stringify({
      model: modelId,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = await this._claude.invoke({ bodyJson });

    return {
      reply: reply.text,
      model: reply.model,
      usage: {
        inputTokens: reply.input_tokens,
        outputTokens: reply.output_tokens,
      },
    };
  }
}
