import { buildStandupPrompt } from "../utils/standup-prompt";
import type { StandupContext } from "../utils/standup-prompt";

const BASE: StandupContext = {
  priorDate: "2026-07-25",
  priorChronicle: "## Work Completed\n\n- feat: queue GUI (#14)",
  priorNotes: "### 2026-07-25T09:00:00Z\n\nFinished queue GUI, opened PR #14.",
  todayDate: "2026-07-26",
  todayChronicle: "",
  todayNotes: "",
  activeItems: [{ text: "Ship standup feature", checked: false, tags: [] }],
  nextUpItems: [
    { text: "Demo polish", checked: false, tags: ["due:2026-09-15"] },
  ],
};

describe("buildStandupPrompt", () => {
  it("includes prior date, chronicle, and notes", () => {
    const p = buildStandupPrompt(BASE);
    expect(p).toContain("2026-07-25");
    expect(p).toContain("feat: queue GUI");
    expect(p).toContain("Finished queue GUI");
  });

  it("includes today date", () => {
    const p = buildStandupPrompt(BASE);
    expect(p).toContain("2026-07-26");
  });

  it("says no activity when today is empty", () => {
    const p = buildStandupPrompt({
      ...BASE,
      todayChronicle: "",
      todayNotes: "",
    });
    expect(p).toContain("No activity or notes recorded yet today");
  });

  it("says no activity when both chronicle and notes are empty for prior session", () => {
    const p = buildStandupPrompt({
      ...BASE,
      priorChronicle: "",
      priorNotes: "",
    });
    expect(p).toContain("No activity or notes recorded for this date");
  });

  it("says no activity when today chronicle and notes are both empty", () => {
    const p = buildStandupPrompt({
      ...BASE,
      todayChronicle: "",
      todayNotes: "",
    });
    expect(p).toContain("No activity or notes recorded yet today");
  });

  it("includes active queue items", () => {
    const p = buildStandupPrompt(BASE);
    expect(p).toContain("Ship standup feature");
  });

  it("includes next-up queue items with tags", () => {
    const p = buildStandupPrompt(BASE);
    expect(p).toContain("Demo polish");
    expect(p).toContain("[due:2026-09-15]");
  });

  it("says queue is empty when no items", () => {
    const p = buildStandupPrompt({ ...BASE, activeItems: [], nextUpItems: [] });
    expect(p).toContain("Queue is empty");
  });

  it("ends with the standup instruction", () => {
    const p = buildStandupPrompt(BASE);
    expect(p).toContain("write my standup update");
  });
});
