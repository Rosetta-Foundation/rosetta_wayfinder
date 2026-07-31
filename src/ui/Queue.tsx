import { useState } from "react";
import { getAppHandler } from "../container";
import type { QueueState } from "../types";

interface Props {
  repoPath: string;
  initial: QueueState;
}

/**
 * Personal queue panel — surfaces Active / Next Up / Inbox sections with
 * checkbox toggling. Every toggle auto-commits via QueueService (PRD-0010 §3.5).
 */
export const Queue = ({ repoPath, initial }: Props) => {
  const [queue, setQueue] = useState<QueueState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handler = getAppHandler();

  const onToggle = async (sectionTitle: string, itemText: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await handler.toggleQueueItem(
        repoPath,
        sectionTitle,
        itemText,
      );
      setQueue(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const hasItems = queue.sections.some((s) => s.items.length > 0);

  return (
    <section className="panel">
      <h2 className="panel__title">What's Next</h2>
      {error && <p className="status status--error">{error}</p>}
      {!hasItems && (
        <p className="status">
          Queue is empty — add items to chronicles/queue.md.
        </p>
      )}
      {queue.sections
        .filter((s) => s.items.length > 0)
        .map((section) => (
          <div key={section.title} className="queue__section">
            <h3 className="queue__section-title">{section.title}</h3>
            <ul className="queue__list">
              {section.items.map((item, i) => (
                <li
                  key={i}
                  className={`queue__item${item.checked ? " queue__item--done" : ""}`}
                >
                  <label className="queue__label">
                    <input
                      type="checkbox"
                      className="queue__check"
                      checked={item.checked}
                      disabled={busy}
                      onChange={() => void onToggle(section.title, item.text)}
                    />
                    <span className="queue__text">{item.text}</span>
                  </label>
                  {item.tags.length > 0 && (
                    <span className="queue__tags mono">
                      {item.tags.map((t) => `[${t}]`).join(" ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
};
