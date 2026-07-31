import "reflect-metadata";
import { Container } from "inversify";
import { WAYFINDER_TOKENS } from "../tokens";
import { IChatService, ChatService } from "../services/chat.service";
import { IClaudeRepository } from "../repositories/claude.repository";
import type { ChatMessage } from "../types";
import { MODEL_IDS } from "../config/claude";

/**
 * Tests the ChatService business logic (request shaping, model resolution,
 * usage mapping) with a mocked Claude repository — no real API call.
 */
describe("ChatService", () => {
  let container: Container;
  let service: IChatService;
  let mockClaude: jest.Mocked<IClaudeRepository>;

  beforeEach(() => {
    mockClaude = {
      invoke: jest.fn().mockResolvedValue({
        text: "hi there",
        input_tokens: 12,
        output_tokens: 4,
        model: "claude-sonnet-5",
      }),
    };
    container = new Container();
    container
      .bind<IClaudeRepository>(WAYFINDER_TOKENS.ClaudeRepository)
      .toConstantValue(mockClaude);
    container.bind<IChatService>(WAYFINDER_TOKENS.ChatService).to(ChatService);
    service = container.get<IChatService>(WAYFINDER_TOKENS.ChatService);
  });

  it("resolves auto to the sonnet model id", async () => {
    await service.send([], "hello", "auto");
    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.model).toBe(MODEL_IDS.sonnet);
  });

  it("maps explicit model choices to their ids", async () => {
    await service.send([], "hello", "opus");
    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.model).toBe(MODEL_IDS.opus);
  });

  it("defaults to auto when no model is given", async () => {
    await service.send([], "hello");
    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.model).toBe(MODEL_IDS.sonnet);
  });

  it("appends the new prompt after the history in the request body", async () => {
    const history: ChatMessage[] = [
      { role: "user", content: "first" },
      { role: "assistant", content: "reply" },
    ];
    await service.send(history, "second");

    const body = JSON.parse(mockClaude.invoke.mock.calls[0][0].bodyJson);
    expect(body.messages).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "second" },
    ]);
    expect(typeof body.max_tokens).toBe("number");
  });

  it("maps the reply and token usage into the turn result", async () => {
    const result = await service.send([], "hello");
    expect(result.reply).toBe("hi there");
    expect(result.model).toBe("claude-sonnet-5");
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 4 });
  });
});
