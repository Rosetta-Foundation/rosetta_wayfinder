import { injectable } from "inversify";

/**
 * Resource-access seam for the system clock. Wall-clock time is an external
 * resource, so reading it lives in a repository (ADR-0003 / HSR) — this keeps
 * services that depend on "today" deterministic and testable via a mock.
 */
export interface IClockRepository {
  /** Today's date as an ISO `YYYY-MM-DD` string in local time. */
  today(): string;
  /** Current instant as an ISO-8601 timestamp. */
  now(): string;
}

@injectable()
export class ClockRepository implements IClockRepository {
  /** @inheritDoc */
  today(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /** @inheritDoc */
  now(): string {
    return new Date().toISOString();
  }
}
