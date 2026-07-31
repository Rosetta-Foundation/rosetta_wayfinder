import { useState } from "react";
import { getAppHandler } from "../container";
import type { ModelChoice, StandupResult } from "../types";

const MODEL_OPTIONS: { value: ModelChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku (fast)" },
];

interface Props {
  repoPath: string;
}

/**
 * One-click standup summary panel. Reads yesterday's notes, today's notes,
 * and the Active/Next Up queue from the personal chronicle, feeds them to
 * Claude, and returns a paste-ready standup update (PRD-0010 §3 / issue #15).
 */
export const Standup = ({ repoPath }: Props) => {
  const [result, setResult] = useState<StandupResult | null>(null);
  const [model, setModel] = useState<ModelChoice>("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handler = getAppHandler();

  const onGenerate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await handler.getStandup(repoPath, model);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2 className="panel__title">Standup</h2>
        <div className="chat__controls">
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
          <button className="btn" onClick={onGenerate} disabled={busy}>
            {busy ? "Generating…" : "Generate standup"}
          </button>
        </div>
      </div>

      {error && <p className="status status--error">{error}</p>}

      {result && (
        <>
          <pre className="standup__result">{result.summary}</pre>
          <p className="chat__compliance mono">
            {result.model.replace("claude-", "")} · {result.usage.inputTokens}→
            {result.usage.outputTokens} tok · Claude API
          </p>
        </>
      )}

      {!result && !busy && !error && (
        <p className="status">
          Summarises yesterday's notes, today's notes, and your Active / Next Up
          queue.
        </p>
      )}
    </section>
  );
};
