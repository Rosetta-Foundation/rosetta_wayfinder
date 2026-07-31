import { useState } from "react";
import { getAppHandler } from "../container";
import type { WorkspaceInit } from "../types";

interface Props {
  onComplete: (ws: WorkspaceInit) => void;
}

/**
 * First-run onboarding screen.
 * Shown when no chronicle path is configured and no default path exists.
 * Goal: install → open → connect → done in under 3 minutes.
 */
export const Onboarding = ({ onComplete }: Props) => {
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handler = getAppHandler();

  const onConnect = async () => {
    const trimmed = path.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ws = await handler.changeChronicle(trimmed);
      onComplete(ws);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__brand">
          <img
            src="/wayfinder.png"
            width={64}
            height={64}
            alt="Wayfinder"
            style={{ borderRadius: 14 }}
          />
          <div>
            <h1 className="onboarding__name">Wayfinder</h1>
            <p className="onboarding__tagline">
              Chronicle is the memory. Wayfinder is the guide.
            </p>
          </div>
        </div>

        <p className="onboarding__intro">
          Wayfinder reads your local Chronicle repo to give you standup
          summaries, a personal queue, and AI answers grounded in your team's
          knowledge — all local-first, with model calls via the Claude API.
        </p>

        <div className="onboarding__step">
          <span className="onboarding__step-num">1</span>
          <div className="onboarding__step-body">
            <p className="onboarding__step-label">
              Point Wayfinder at your Chronicle repo
            </p>
            <p className="onboarding__step-hint">
              Typically <code>~/Wayfinder/chronicle</code> or your cloned{" "}
              <code>rosetta_chronicle_*</code> repo path.
            </p>
            <input
              className="onboarding__input mono"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onConnect();
              }}
              placeholder="Absolute path to your chronicle repo…"
              spellCheck={false}
              autoFocus
            />
            {error && <p className="status status--error">{error}</p>}
          </div>
        </div>

        <div className="onboarding__step onboarding__step--muted">
          <span className="onboarding__step-num onboarding__step-num--muted">
            2
          </span>
          <div className="onboarding__step-body">
            <p className="onboarding__step-label">
              Claude API key is picked up from the environment
            </p>
            <p className="onboarding__step-hint">
              Set <code>ANTHROPIC_API_KEY</code> in your shell before launching
              Wayfinder. The key stays in the native process — never in the
              webview.
            </p>
          </div>
        </div>

        <button
          className="btn onboarding__cta"
          onClick={onConnect}
          disabled={busy || !path.trim()}
        >
          {busy ? "Connecting…" : "Connect chronicle →"}
        </button>
      </div>
    </main>
  );
};
