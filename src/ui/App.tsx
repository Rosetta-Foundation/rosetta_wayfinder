import { useEffect, useState } from "react";
import { getAppHandler } from "../container";
import { LedgerEntry, QueueState, WorkspaceInit } from "../types";
import { formatLocalDateTime, localTimezoneLabel } from "../utils/datetime";
import { Chat } from "./Chat";
import { Onboarding } from "./Onboarding";
import { Queue } from "./Queue";
import { Standup } from "./Standup";
type BootState = "loading" | "onboarding" | "ready" | "error";

const Logo = ({ size }: { size: number }) => (
  <img
    className="brand__mark"
    src="/wayfinder.png"
    width={size}
    height={size}
    alt="Wayfinder"
  />
);

export const App = () => {
  const [bootState, setBootState] = useState<BootState>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInit | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [todayNote, setTodayNote] = useState("");
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [changingPath, setChangingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handler = getAppHandler();

  const loadWorkspace = async (ws: WorkspaceInit) => {
    const [note, q, hist] = await Promise.all([
      handler.loadTodayNote(ws.repoPath),
      handler.loadQueue(ws.repoPath),
      handler.getHistory(ws.repoPath),
    ]);
    setWorkspace(ws);
    setTodayNote(note);
    setQueue(q);
    setHistory(hist);
    setBootState("ready");
  };

  useEffect(() => {
    (async () => {
      try {
        const ws = await handler.bootstrap();
        if (ws.created) {
          // First run — no prior config or chronicle. Show onboarding rather
          // than landing on an empty auto-created repo.
          setBootState("onboarding");
        } else {
          await loadWorkspace(ws);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBootState("error");
      }
    })();
    // handler is stable for the app lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangePath = async () => {
    const trimmed = pathDraft.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const ws = await handler.changeChronicle(trimmed);
      await loadWorkspace(ws);
      setChangingPath(false);
      setPathDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onSave = async () => {
    if (!workspace || !draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await handler.appendNote(workspace.repoPath, draft);
      setTodayNote(result.note);
      setDraft("");
      setSavedAt(result.sha.slice(0, 7));
      setHistory(await handler.getHistory(workspace.repoPath));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (bootState === "loading") {
    return (
      <main className="shell shell--center">
        <Logo size={56} />
        <p className="status">Setting up your workspace…</p>
      </main>
    );
  }

  if (bootState === "onboarding") {
    return <Onboarding onComplete={(ws) => void loadWorkspace(ws)} />;
  }

  if (bootState === "error") {
    return (
      <main className="shell shell--center">
        <Logo size={48} />
        <p className="status status--error">{error}</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="brand">
        <Logo size={48} />
        <div>
          <h1 className="brand__name">Wayfinder</h1>
          <p className="brand__tagline">
            Chronicle is the memory. Wayfinder is the guide.
          </p>
        </div>
      </header>

      {error && <p className="status status--error">{error}</p>}

      {workspace && (
        <>
          {/* 1. Queue — first thing an exec sees */}
          {queue && <Queue repoPath={workspace.repoPath} initial={queue} />}

          {/* 2. Standup — the pitch demo centrepiece */}
          <Standup repoPath={workspace.repoPath} />

          {/* 3. New entry + today's note */}
          <section className="panel">
            <h2 className="panel__title">Capture</h2>
            <textarea
              className="editor"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSavedAt(null);
              }}
              placeholder="What happened? Decisions, ideas, follow-ups…"
              rows={4}
              spellCheck
            />
            <div className="editor__actions">
              <button
                className="btn"
                onClick={onSave}
                disabled={saving || !draft.trim()}
              >
                {saving ? "Saving…" : "Add to today"}
              </button>
              {savedAt && <span className="status">Saved · {savedAt}</span>}
            </div>
            {todayNote.trim() && (
              <div className="today-note">
                <p className="today-note__label">Today's entries</p>
                <pre className="note-log">{todayNote.trim()}</pre>
              </div>
            )}
          </section>

          {/* 4. Org knowledge + personal chronicle */}
          <Chat chronicleRepoPath={workspace.repoPath} />

          {/* 5. Chronicle ledger */}
          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Chronicle</h2>
              <span
                className="panel__badge"
                title="Times shown in your local timezone; stored as UTC"
              >
                {localTimezoneLabel()}
              </span>
            </div>
            <div className="workspace__path">
              <span className="facts__hint mono">{workspace.repoPath}</span>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setChangingPath((v) => !v);
                  setPathDraft(workspace.repoPath);
                }}
              >
                Change
              </button>
            </div>
            {changingPath && (
              <div className="workspace__change">
                <input
                  className="workspace__input mono"
                  value={pathDraft}
                  onChange={(e) => setPathDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onChangePath();
                    if (e.key === "Escape") setChangingPath(false);
                  }}
                  placeholder="Absolute path to chronicle repo…"
                  spellCheck={false}
                  autoFocus
                />
                <button
                  className="btn"
                  onClick={onChangePath}
                  disabled={!pathDraft.trim()}
                >
                  Use this path
                </button>
              </div>
            )}
            {history.length === 0 ? (
              <p className="status">No entries yet.</p>
            ) : (
              <ul className="ledger">
                {history.map((entry) => (
                  <li key={entry.sha} className="ledger__item">
                    <span className="ledger__msg">{entry.message}</span>
                    <span className="ledger__meta mono">
                      {entry.sha.slice(0, 7)} ·{" "}
                      {formatLocalDateTime(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
};
