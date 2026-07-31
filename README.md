# Wayfinder

> Chronicle is the memory. Wayfinder is the guide.

Wayfinder is the local-first desktop app of the Rosetta platform. It surfaces your Chronicle — your
personal knowledge ledger — through a polished UI, and adds AI-powered features via the Claude API.

## What it does

- **Standup in one click** — reads yesterday's activity, today's notes, and your queue; generates a
  paste-ready standup update via Claude.
- **Personal queue** — renders your `chronicles/queue.md` with checkbox toggling; every check is
  an invisible git commit in the ledger.
- **Note capture** — append timestamped entries to today's chronicle log; auto-committed.
- **Org knowledge query** — RAG over the org docs repo (PRDs, ADRs, chronicles) with citations;
  grounded answers, not hallucinations.
- **Free chat** — general-purpose Claude chat panel.

AI calls use the Anthropic Messages API. Set `ANTHROPIC_API_KEY` in your environment; the key stays
in the Rust core — never in the webview (ADR-0003).

For agent-style automation outside the Wayfinder UI, use the [Cursor SDK](https://cursor.com/docs/sdk/typescript)
with `CURSOR_API_KEY`. Wayfinder chat/standup/knowledge use Claude directly.

## Setup

```bash
# Prerequisites: Node 20+, Bun 1.3+, Rust stable, Tauri CLI
export ANTHROPIC_API_KEY=sk-ant-...
bun install
bun run tauri:dev
```

On first launch, Wayfinder asks you to point it at your chronicle repo. The path is saved to
`~/.wayfinder/config.json` and used on every subsequent launch.

## Architecture

Tauri 2.x desktop app:

- **Rust backend** — thin transport shim only (git ops via libgit2, Claude HTTP, filesystem).
  No business logic in Rust.
- **TypeScript frontend** — all logic under the Handler / Service / Repository pattern with
  InversifyJS (see workspace architecture rules).

## Demo

See [DEMO.md](DEMO.md) for the demo script and seeded data instructions.

## License

[Apache-2.0](LICENSE) — Copyright 2026 Rosetta Foundation.
