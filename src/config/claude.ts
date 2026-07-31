import type { ModelChoice } from "../types";

/**
 * Claude API configuration for Wayfinder.
 *
 * Model IDs are Claude API ids. See
 * https://platform.claude.com/docs/en/about-claude/models/overview
 */
/** Concrete Claude model ids per user-facing choice. */
export const MODEL_IDS: Record<Exclude<ModelChoice, "auto">, string> = {
  sonnet: "claude-sonnet-5",
  opus: "claude-opus-5",
  haiku: "claude-haiku-4-5",
};

/** `auto` resolves to Sonnet — the balanced default. */
export const AUTO_MODEL: Exclude<ModelChoice, "auto"> = "sonnet";

/** Resolve a user model choice to a concrete Claude model id. */
export const resolveModelId = (choice: ModelChoice): string =>
  choice === "auto" ? MODEL_IDS[AUTO_MODEL] : MODEL_IDS[choice];

/** Default max tokens per reply. */
export const DEFAULT_MAX_TOKENS = 2048;
