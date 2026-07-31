import {
  parseQueue,
  toggleItemInRaw,
  defaultQueueContent,
} from "../utils/queue-parser";

const SAMPLE = `# Work Queue

## Active
- [ ] Ship the demo [due:2026-09-15]
- [x] Write PRD-0011 [prd:0011]

## Next Up
- [ ] Queue filter UI

## Inbox
- [ ] Follow up with Vinay [follow-up]
`;

describe("parseQueue", () => {
  it("parses section titles", () => {
    const { sections } = parseQueue(SAMPLE);
    expect(sections.map((s) => s.title)).toEqual([
      "Active",
      "Next Up",
      "Inbox",
    ]);
  });

  it("parses unchecked items", () => {
    const { sections } = parseQueue(SAMPLE);
    const active = sections[0];
    expect(active.items[0].checked).toBe(false);
    expect(active.items[0].text).toBe("Ship the demo");
  });

  it("parses checked items", () => {
    const { sections } = parseQueue(SAMPLE);
    expect(sections[0].items[1].checked).toBe(true);
    expect(sections[0].items[1].text).toBe("Write PRD-0011");
  });

  it("extracts tags from items", () => {
    const { sections } = parseQueue(SAMPLE);
    expect(sections[0].items[0].tags).toEqual(["due:2026-09-15"]);
    expect(sections[0].items[1].tags).toEqual(["prd:0011"]);
  });

  it("strips tags from display text", () => {
    const { sections } = parseQueue(SAMPLE);
    expect(sections[0].items[0].text).toBe("Ship the demo");
  });

  it("preserves raw content for round-trips", () => {
    const { raw } = parseQueue(SAMPLE);
    expect(raw).toBe(SAMPLE);
  });

  it("returns empty sections array for empty input", () => {
    expect(parseQueue("").sections).toEqual([]);
  });
});

describe("toggleItemInRaw", () => {
  it("checks an unchecked item", () => {
    const updated = toggleItemInRaw(SAMPLE, "Active", "Ship the demo");
    expect(updated).toContain("- [x] Ship the demo");
  });

  it("unchecks a checked item", () => {
    const updated = toggleItemInRaw(SAMPLE, "Active", "Write PRD-0011");
    expect(updated).toContain("- [ ] Write PRD-0011");
  });

  it("does not modify items in other sections", () => {
    const updated = toggleItemInRaw(SAMPLE, "Active", "Ship the demo");
    expect(updated).toContain("- [ ] Queue filter UI");
  });

  it("does not modify non-matching items in the same section", () => {
    const updated = toggleItemInRaw(SAMPLE, "Active", "Ship the demo");
    expect(updated).toContain("- [x] Write PRD-0011");
  });

  it("returns the original string when the item is not found", () => {
    const updated = toggleItemInRaw(SAMPLE, "Active", "nonexistent item");
    expect(updated).toBe(SAMPLE);
  });
});

describe("defaultQueueContent", () => {
  it("includes the three standard sections", () => {
    const content = defaultQueueContent();
    expect(content).toContain("## Active");
    expect(content).toContain("## Next Up");
    expect(content).toContain("## Inbox");
  });
});
