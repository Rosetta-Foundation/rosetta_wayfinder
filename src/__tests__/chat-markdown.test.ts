import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "@swc/core";
import * as React from "react";
import type { ReactElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as markdownUtils from "../utils/markdown";
import type { Citation } from "../types";

/**
 * Component tests for Chat.tsx markdown display (SPEC-PRD-0013-P1 T-01),
 * asserted against the server-rendered DOM of the real component.
 *
 * The project's jest transform only covers `.ts`, so this harness compiles
 * Chat.tsx on the fly with @swc/core (mirroring the jest.config.js settings,
 * plus tsx) and evaluates it with its module imports stubbed — no Tauri IPC
 * and no real handler chain.
 */

interface TestMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface ChatProps {
  orgRepoPath?: string;
  chronicleRepoPath?: string;
  initialMessages?: TestMessage[];
}

type ChatComponent = (props: ChatProps) => ReactElement;

const loadChat = (): ChatComponent => {
  const source = readFileSync(join(__dirname, "..", "ui", "Chat.tsx"), "utf8");
  const { code } = transformSync(source, {
    filename: "Chat.tsx",
    module: { type: "commonjs" },
    jsc: {
      parser: { syntax: "typescript", tsx: true },
      transform: { react: { runtime: "automatic" } },
      target: "es2021",
    },
  });

  // Render-only tests: the handler is resolved during render but never invoked.
  const stubHandler = {
    askKnowledge: () => Promise.reject(new Error("not called in render tests")),
    sendChat: () => Promise.reject(new Error("not called in render tests")),
  };
  const modules: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "../container": { getAppHandler: () => stubHandler },
    "../utils/markdown": markdownUtils,
  };
  const requireStub = (id: string): unknown => {
    if (id in modules) {
      return modules[id];
    }
    throw new Error(`Chat.tsx imported an unstubbed module: ${id}`);
  };

  const exportsObject: Record<string, unknown> = {};
  const moduleObject = { exports: exportsObject };
  new Function("require", "module", "exports", code)(
    requireStub,
    moduleObject,
    exportsObject,
  );

  return (moduleObject.exports as { Chat: ChatComponent }).Chat;
};

describe("Chat markdown rendering", () => {
  const Chat = loadChat();

  const renderChat = (props: ChatProps = {}): string =>
    renderToStaticMarkup(React.createElement(Chat, props));

  it("renders assistant markdown as h2/strong/code/ul-li in the message log", () => {
    const content = "## Heading\n\n**bold** and `code`\n\n- first\n- second";
    const message: TestMessage = { role: "assistant", content };

    const html = renderChat({ initialMessages: [message] });

    expect(html).toContain('class="chat__content chat__content--md"');
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul><li>first</li><li>second</li></ul>");
  });

  it("renders links and blockquotes in assistant responses", () => {
    const html = renderChat({
      initialMessages: [
        {
          role: "assistant",
          content: "See [docs](https://example.com/prd)\n\n> Quoted insight",
        },
      ],
    });

    expect(html).toContain('<a href="https://example.com/prd"');
    expect(html).toContain(">docs</a>");
    expect(html).toContain("<blockquote><p>Quoted insight</p></blockquote>");
  });

  it("keeps the stored answer/reply value as the raw markdown string", () => {
    const content = "## Heading\n\n**bold**";
    const message: TestMessage = { role: "assistant", content };

    renderChat({ initialMessages: [message] });

    // Rendering is display-time only: the message object handed to the
    // component still holds the unmodified markdown (no data-contract change).
    expect(message.content).toBe(content);
  });

  it("renders user messages as plain text with no markdown transformation", () => {
    const html = renderChat({
      initialMessages: [
        { role: "user", content: "**not markdown** and `not code`" },
      ],
    });

    expect(html).toContain(
      '<p class="chat__content">**not markdown** and `not code`</p>',
    );
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("<code>");
  });

  it("renders the input textarea as a plain-text field, untouched by markdown", () => {
    const html = renderChat();

    // The input surface stays a raw <textarea class="editor"> — submissions
    // pass the typed string through unchanged (see ChatService tests for the
    // request contract).
    expect(html).toContain('<textarea class="editor"');
    expect(html).not.toContain("chat__content--md");
  });

  it("renders the chat__citations list unchanged alongside markdown answers", () => {
    const html = renderChat({
      initialMessages: [
        {
          role: "assistant",
          content: "## Answer",
          citations: [{ relativePath: "docs/prd.md", heading: "Goals" }],
        },
      ],
    });

    expect(html).toContain('class="chat__citations"');
    expect(html).toContain("docs/prd.md › Goals");
  });
});
