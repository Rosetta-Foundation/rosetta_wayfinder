/**
 * @jest-environment jsdom
 */
import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Chat } from "../ui/Chat";
import type { Citation } from "../types";

/**
 * Component tests for Chat.tsx markdown display (SPEC-PRD-0013-P1 T-01).
 * Chat's public props are unchanged — conversation state is driven through
 * the real textarea + Send path with a mocked AppHandler.
 */

const askKnowledge = jest.fn();
const sendChat = jest.fn();

jest.mock("../container", () => ({
  getAppHandler: () => ({
    askKnowledge: (...args: unknown[]) => askKnowledge(...args),
    sendChat: (...args: unknown[]) => sendChat(...args),
  }),
}));

const typeAndSend = (text: string): void => {
  // Mode defaults to "org", which also renders the org-path input — target
  // the editor textarea explicitly so we never type into the path field.
  const textarea = document.querySelector(
    "textarea.editor",
  ) as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};

describe("Chat markdown rendering", () => {
  beforeEach(() => {
    askKnowledge.mockReset();
    sendChat.mockReset();
  });

  it("renders assistant markdown as h2/strong/code/ul-li in the message log", async () => {
    const answer = "## Heading\n\n**bold** and `code`\n\n- first\n- second";
    askKnowledge.mockResolvedValue({
      answer,
      citations: [],
      model: "claude-sonnet-5",
      usage: { inputTokens: 1, outputTokens: 2 },
    });

    render(createElement(Chat, {}));
    typeAndSend("what is the plan?");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Heading" }),
      ).toBeTruthy();
    });

    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");
    const items = screen.getAllByRole("listitem");
    expect(items.some((el) => el.textContent === "first")).toBe(true);
    expect(items.some((el) => el.textContent === "second")).toBe(true);
    expect(document.querySelector(".chat__content--md")).not.toBeNull();
  });

  it("renders links and blockquotes in assistant responses", async () => {
    askKnowledge.mockResolvedValue({
      answer: "See [docs](https://example.com/prd)\n\n> Quoted insight",
      citations: [],
      model: "claude-sonnet-5",
      usage: { inputTokens: 1, outputTokens: 2 },
    });

    render(createElement(Chat, {}));
    typeAndSend("link please");

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "docs" })).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: "docs" }).getAttribute("href")).toBe(
      "https://example.com/prd",
    );
    expect(
      screen.getByText("Quoted insight").closest("blockquote"),
    ).not.toBeNull();
  });

  it("keeps stored answer/reply values as raw markdown strings", async () => {
    const answer = "## Raw **markdown** `kept`";
    askKnowledge.mockResolvedValue({
      answer,
      citations: [],
      model: "claude-sonnet-5",
      usage: { inputTokens: 1, outputTokens: 2 },
    });

    render(createElement(Chat, {}));
    typeAndSend("q");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    });

    // Display-time only: the handler payload (data contract) stays raw markdown.
    const result = await askKnowledge.mock.results[0].value;
    expect(result.answer).toBe(answer);

    // Chat rendered the assistant bubble via the markdown container — the
    // stored contract string itself was never rewritten.
    const assistantBubbles = document.querySelectorAll(
      ".chat__message--assistant .chat__content--md",
    );
    expect(assistantBubbles.length).toBeGreaterThan(0);
    expect(result.answer).toContain("## Raw");
    expect(result.answer).toContain("**markdown**");
  });

  it("renders and submits the user input textarea as plain text", async () => {
    askKnowledge.mockResolvedValue({
      answer: "ok",
      citations: [],
      model: "claude-sonnet-5",
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    render(createElement(Chat, {}));

    const textarea = document.querySelector(
      "textarea.editor",
    ) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.classList.contains("editor")).toBe(true);

    const typed = "**not transformed** and `plain`";
    typeAndSend(typed);

    await waitFor(() => {
      expect(askKnowledge).toHaveBeenCalled();
    });

    // Submitted prompt is the plain trimmed string — no markdown pipeline.
    expect(askKnowledge.mock.calls[0][1]).toBe(typed);
    // User bubble shows literal markdown syntax, not rendered elements.
    const userBubble = screen.getByText(typed);
    expect(userBubble.tagName).toBe("P");
    expect(userBubble.closest("strong")).toBeNull();
  });

  it("renders the chat__citations list unchanged alongside markdown answers", async () => {
    const citations: Citation[] = [
      { relativePath: "docs/prd.md", heading: "Goals" },
    ];
    askKnowledge.mockResolvedValue({
      answer: "## Answer",
      citations,
      model: "claude-sonnet-5",
      usage: { inputTokens: 1, outputTokens: 2 },
    });

    render(createElement(Chat, {}));
    typeAndSend("cite me");

    await waitFor(() => {
      expect(screen.getByText("docs/prd.md › Goals")).toBeTruthy();
    });

    const citationsList = document.querySelector("ul.chat__citations");
    expect(citationsList).not.toBeNull();
    expect(citationsList?.querySelector("li.mono")?.textContent).toBe(
      "docs/prd.md › Goals",
    );
  });
});
