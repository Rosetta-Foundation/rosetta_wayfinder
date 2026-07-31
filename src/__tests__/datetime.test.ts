import { formatLocalDateTime, localTimezoneLabel } from "../utils/datetime";

/**
 * These assert timezone-aware DISPLAY behavior. An explicit zone is passed so
 * the assertions are deterministic (V8 caches process.env.TZ and won't switch
 * mid-process). Production omits the arg and uses the viewer's system zone.
 * Storage remains UTC; only rendering shifts to local.
 */
describe("formatLocalDateTime", () => {
  it("renders a UTC instant in the given local timezone (America/Chicago)", () => {
    // 2026-07-24T02:30:00Z is 2026-07-23 21:30 CDT (UTC-5 in July).
    const out = formatLocalDateTime("2026-07-24T02:30:00Z", "America/Chicago");
    expect(out).toContain("07/23"); // date shifted back a day by the offset
    expect(out).toMatch(/9:30/); // 21:30 rendered as 9:30 PM
    expect(out).toMatch(/PM/i);
  });

  it("renders the same instant differently in another zone (Asia/Tokyo)", () => {
    // 2026-07-24T02:30:00Z is 2026-07-24 11:30 JST (UTC+9).
    const out = formatLocalDateTime("2026-07-24T02:30:00Z", "Asia/Tokyo");
    expect(out).toContain("07/24");
    expect(out).toMatch(/11:30/);
    expect(out).toMatch(/AM/i);
  });

  it("returns the raw input when the timestamp is unparseable", () => {
    expect(formatLocalDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("localTimezoneLabel", () => {
  it("returns a short zone label for the given timezone", () => {
    const label = localTimezoneLabel(
      new Date("2026-07-24T12:00:00Z"),
      "America/Chicago",
    );
    // Summer → CDT; some ICU builds render GMT-offset forms.
    expect(label).toMatch(/CDT|CST|GMT|UTC/);
  });

  it("always returns a non-empty string", () => {
    expect(localTimezoneLabel().length).toBeGreaterThan(0);
  });
});
