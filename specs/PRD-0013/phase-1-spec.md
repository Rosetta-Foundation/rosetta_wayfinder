---
id: SPEC-PRD-0013-P1
prd: PRD-0013
phase: 1
status: Draft # Draft | Approved | Done | Superseded
date: 2026-08-01
owner: Russ Watson
envelope:
  allowedPaths: ["src/ui/Chat.tsx", "src/ui/styles.css", "src/utils/markdown*", "src/__tests__/**", "package.json", "bun.lock"]
  forbiddenSurfaces: ["migrations", "auth", "ci-config", "server-api", "data-contract", "storage-schema"]
  maxDiffLines: 600
  budgetK: 80
---

# SPEC-PRD-0013-P1: Render assistant chat responses as sanitized, theme-consistent markdown in the Wayfinder panel. Phase 1 of PRD-0013 adds client-side markdown-to-HTML rendering in Chat.tsx at display time (S-01), enforces sanitization of untrusted model output so embedded raw HTML cannot execute script or inject DOM (S-02), and styles the rendered elements with the panel's existing typography and theme variables so output looks native in both dark and light themes (S-03). Stored answer/reply strings remain raw markdown; the data contract, user input textarea, and citations rendering are unchanged.

## Context

Assistant responses currently display as raw markdown text, so structure like headings, lists, and code blocks appears as literal syntax characters. PRD-0013 Phase 1 introduces display-time rendering only: parsing happens client-side in Chat.tsx when a response is shown, and the persisted answer/reply strings stay raw markdown so no API, storage, or data-contract changes are required. Because model output is untrusted content (per PRD-0010 §3.3/Phase 2), rendering must pass through sanitization that neutralizes raw HTML such as script tags and inline event handlers while preserving legitimate markdown-derived elements. Styling must reuse the panel's existing font, spacing, and color variables (--text/--muted/--accent) so rendered markdown is visually consistent in the existing dark theme and the PRD-0014 light theme. The user's input textarea remains plain text and the existing chat__citations list rendering must not change. Verification gates for every task are bun run lint (tsc --noEmit) and bun run test with no regressions.

## Task T-01: Add markdown rendering pipeline for assistant responses in Chat.tsx

- **Story:** S-01
- **Complexity:** M
- **Depends on:** []

Introduce a small, well-maintained markdown parser (e.g. react-markdown or marked + a thin wrapper) and apply it only to assistant answer/reply strings at display time in Chat.tsx. Keep the transformation purely presentational: stored strings remain raw markdown and no request/response or persistence shape changes. Do not touch the user input textarea (stays plain text) or the chat__citations block. Isolate parsing behind a single render helper/component so T-02 can wrap sanitization around it without touching call sites. Avoid dangerouslySetInnerHTML directly in Chat.tsx; if the chosen library requires HTML injection, confine it to the helper so the sanitization boundary in T-02 is a single choke point.

### Acceptance criteria

- [ ] test: A response containing '## Heading', '**bold**', '`code`', and a '-' list renders as h2, strong, code, and ul/li elements respectively, asserted via component tests on the rendered DOM
- [ ] test: Links and blockquotes in a response render as a and blockquote elements
- [ ] test: The stored answer/reply values passed into the component remain raw markdown strings; tests assert the component receives and preserves unmodified markdown input (no data-contract change)
- [ ] test: The user input textarea renders and submits plain text with no markdown transformation applied
- [ ] test: Existing tests covering chat__citations list rendering pass unchanged
- [ ] test: bun run lint (tsc --noEmit) and bun run test pass with no regressions

## Task T-02: Sanitize rendered markdown output against untrusted model HTML

- **Story:** S-02
- **Complexity:** M
- **Depends on:** [T-01]

Model output is untrusted (PRD-0010 §3.3/Phase 2). Enforce sanitization at the single markdown-render boundary created in T-01 so every assistant response passes through it — prefer disabling raw HTML passthrough in the parser (e.g. react-markdown's default skipHtml behavior) or a DOMPurify-style allowlist if HTML must flow. The allowlist must permit only markdown-derived elements (headings, emphasis, lists, code, links, blockquotes) and strip script tags, event-handler attributes, and javascript: URLs. Sanitization is not optional per call site; make it impossible to render an assistant response without it.

### Acceptance criteria

- [ ] test: A response containing a script tag renders without executing script and without a script element appearing in the DOM
- [ ] test: A response containing an img with an onerror handler (or other inline event-handler attribute) renders with the handler stripped or the element neutralized
- [ ] test: Links with javascript: URLs are neutralized or stripped
- [ ] test: Legitimate markdown-derived elements (headings, lists, code, links, blockquotes) still render correctly after sanitization
- [ ] test: bun run lint and bun run test pass with no regressions

## Task T-03: Style rendered markdown with panel typography and theme variables

- **Story:** S-03
- **Complexity:** S
- **Depends on:** [T-01]

Scope styles to the assistant-response markdown container so they cannot leak into the textarea or citations list. Use only existing theme variables (--text, --muted, --accent) and the panel's established font and spacing scale — no hardcoded colors, so the PRD-0014 light theme works without theme-specific overrides. Give code spans and blocks a distinguishable treatment (e.g. muted background, monospace) that reads correctly against both dark and light backgrounds. Keep this purely CSS; no changes to the rendering logic from T-01/T-02.

### Acceptance criteria

- [ ] test: Markdown container styles reference the existing theme variables (--text/--muted/--accent) rather than hardcoded color values, asserted by a test or lint check on the stylesheet
- [ ] agent: In the running app with the dark theme active, a response with headings, bold/italic, lists, code, links, and blockquotes renders with the panel's font and spacing and is visually consistent with surrounding UI
- [ ] agent: With the PRD-0014 light theme active, the same rendered markdown remains legible and visually consistent, with code spans and blocks clearly distinguishable from body text in both themes
- [ ] test: bun run lint and bun run test pass with no regressions
