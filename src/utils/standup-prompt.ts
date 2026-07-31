import type { QueueItem } from "../types";

export interface StandupContext {
  /** The date label for the most-recent prior session (may be older than yesterday). */
  priorDate: string;
  /** Auto-generated daily chronicle for the prior session (commits, sessions, summaries). */
  priorChronicle: string;
  /** Manual notes for the prior session. */
  priorNotes: string;
  todayDate: string;
  /** Auto-generated daily chronicle for today so far. */
  todayChronicle: string;
  /** Manual notes for today so far. */
  todayNotes: string;
  activeItems: QueueItem[];
  nextUpItems: QueueItem[];
}

export const STANDUP_SYSTEM = `You are a helpful assistant that prepares daily standup updates.
Write in first person, past/present tense. Be concise — standups are spoken aloud.
Output ONLY the standup text with three labelled sections:
  Yesterday:
  Today:
  Blockers:
If a section has nothing to report, say "Nothing to report." Do not add extra commentary.`;

export const buildStandupPrompt = (ctx: StandupContext): string => {
  const sections: string[] = [];

  sections.push(`## Most recent prior session (${ctx.priorDate})`);
  if (ctx.priorChronicle.trim()) {
    sections.push("### Activity log\n" + ctx.priorChronicle.trim());
  }
  if (ctx.priorNotes.trim()) {
    sections.push("### Notes\n" + ctx.priorNotes.trim());
  }
  if (!ctx.priorChronicle.trim() && !ctx.priorNotes.trim()) {
    sections.push("_No activity or notes recorded for this date._");
  }

  sections.push(`\n## Today so far (${ctx.todayDate})`);
  if (ctx.todayChronicle.trim()) {
    sections.push("### Activity log\n" + ctx.todayChronicle.trim());
  }
  if (ctx.todayNotes.trim()) {
    sections.push("### Notes\n" + ctx.todayNotes.trim());
  }
  if (!ctx.todayChronicle.trim() && !ctx.todayNotes.trim()) {
    sections.push("_No activity or notes recorded yet today._");
  }

  const queueLines: string[] = [];
  if (ctx.activeItems.length > 0) {
    queueLines.push("**Active:**");
    ctx.activeItems.forEach((i) =>
      queueLines.push(
        `- ${i.text}${i.tags.length ? " " + i.tags.map((t) => `[${t}]`).join(" ") : ""}`,
      ),
    );
  }
  if (ctx.nextUpItems.length > 0) {
    queueLines.push("**Next Up:**");
    ctx.nextUpItems.forEach((i) =>
      queueLines.push(
        `- ${i.text}${i.tags.length ? " " + i.tags.map((t) => `[${t}]`).join(" ") : ""}`,
      ),
    );
  }

  sections.push("\n## Work queue");
  sections.push(
    queueLines.length > 0 ? queueLines.join("\n") : "_Queue is empty._",
  );

  sections.push(
    "\n---\nUsing only the notes and queue items above, write my standup update.",
  );

  return sections.join("\n");
};
