import { useState } from "react";
import { getAppHandler } from "../container";
import type { ChatMessage, Citation, ModelChoice } from "../types";

const MODEL_OPTIONS: { value: ModelChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku (fast)" },
];

type Mode = "chat" | "org";

const DEFAULT_ORG_PATH = "";

interface DisplayMessage extends ChatMessage {
  citations?: Citation[];
}

interface Props {
  /** Pre-filled org knowledge repo path (optional — user can still edit). */
  orgRepoPath?: string;
  /** Personal chronicle repo path — searched alongside org knowledge. */
  chronicleRepoPath?: string;
}

/**
 * AI panel with two modes:
 *  - Chat: free conversation through Claude.
 *  - Ask Wayfinder: grounded query (RAG) over org knowledge + personal chronicle with citations.
 * Both route through the AppHandler → service → Claude chain (credentials never
 * touch the webview, ADR-0003).
 */
export const Chat = ({ orgRepoPath, chronicleRepoPath }: Props) => {
  const [mode, setMode] = useState<Mode>("org");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelChoice>("auto");
  const [orgPath, setOrgPath] = useState(orgRepoPath ?? DEFAULT_ORG_PATH);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<string | null>(null);

  const handler = getAppHandler();

  const onSend = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages([...messages, { role: "user", content: prompt }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      if (mode === "org") {
        const res = await handler.askKnowledge(
          orgPath,
          prompt,
          model,
          chronicleRepoPath,
        );
        setMessages((m) => [
          ...m,
          { role: "assistant", content: res.answer, citations: res.citations },
        ]);
        setLastUsage(
          `${res.model.replace("claude-", "")} · ${res.usage.inputTokens}→${res.usage.outputTokens} tok`,
        );
      } else {
        const res = await handler.sendChat(history, prompt, model);
        setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
        setLastUsage(
          `${res.model.replace("claude-", "")} · ${res.usage.inputTokens}→${res.usage.outputTokens} tok`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2 className="panel__title">Ask Wayfinder</h2>
        <div className="chat__controls">
          <select
            className="chat__model"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            title="Mode"
          >
            <option value="org">Ask Wayfinder</option>
            <option value="chat">Free chat</option>
          </select>
          <select
            className="chat__model"
            value={model}
            onChange={(e) => setModel(e.target.value as ModelChoice)}
            title="Model"
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "org" && (
        <input
          className="chat__orgpath mono"
          value={orgPath}
          onChange={(e) => setOrgPath(e.target.value)}
          spellCheck={false}
          title="Org knowledge repo path"
        />
      )}

      {messages.length > 0 && (
        <div className="chat__log">
          {messages.map((m, i) => (
            <div key={i} className={`chat__msg chat__msg--${m.role}`}>
              <span className="chat__role">
                {m.role === "user" ? "You" : "Wayfinder"}
              </span>
              <p className="chat__content">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <ul className="chat__citations">
                  {m.citations.map((c, j) => (
                    <li key={j} className="mono">
                      {c.relativePath} › {c.heading}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {busy && (
            <p className="status">
              {mode === "org" ? "Searching org knowledge…" : "Thinking…"}
            </p>
          )}
        </div>
      )}

      {error && <p className="status status--error">{error}</p>}

      <textarea
        className="editor"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          mode === "org"
            ? 'Ask anything — e.g. "what were my action items from the last IPM?"'
            : "Ask anything… (Enter to send, Shift+Enter for a new line)"
        }
        rows={3}
      />
      <div className="editor__actions">
        <button
          className="btn"
          onClick={onSend}
          disabled={busy || !input.trim()}
        >
          {busy ? "Sending…" : "Send"}
        </button>
        {lastUsage && <span className="status mono">{lastUsage}</span>}
      </div>
      <p className="chat__compliance">Routed through Claude API</p>
    </section>
  );
};
