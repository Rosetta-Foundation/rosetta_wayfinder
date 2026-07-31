# rosetta_wayfinder

Wayfinder is the **knowledge guide** of the Rosetta platform — the UI / query layer that will let
humans and AI ask questions of organizational memory and get evidence-backed answers.

## Status: active development

Wayfinder is the local-first desktop app defined in
[PRD-0010](../rosetta_docs/product/PRD-0010-wayfinder-local-app.md) — the delivery
surface for non-engineers (PMs, product owners, and other stakeholders).

Critical path: app shell → Claude AI → org knowledge query.

## What Wayfinder Is

A local-first Tauri desktop app that gives anyone the same knowledge capture, contribution, and query
capabilities engineers get through Chronicle + Claude Code:

- **Bundled git** (libgit2 via the `git2` Rust crate) as an invisible persistence/ledger layer — the
  user never sees git; every note save is a commit, every sync a push.
- **Claude API** — model calls go through Anthropic's Messages API. The API key stays in the native
  process (never in the webview).
- **Org knowledge query** — evidence-backed answers over the org repo (PRDs, artifacts, chronicles).

## Dependency

Wayfinder is a **consumer** of Chronicle. Chronicle is the source of truth; Wayfinder consumes its
structured knowledge (same chronicle format, same queue format) and does not own or duplicate it.

## Architecture & Conventions

- **App shell:** Tauri 2.x — Rust backend (git ops, Claude HTTP, filesystem) + React/TypeScript frontend (UI only).
- Follow the Rosetta architecture on the TypeScript side: Handler / Service / Repository +
  InversifyJS (see workspace architecture rules).
- Follow the standard Rosetta git workflow, Conventional Commits, and code style (workspace root `CLAUDE.md`).
  Default: `f/` / `b/` topic branches + PR — no commits on `main` unless a human authorizes a
  documented exception. Husky enforces Conventional Commits.

> Chronicle is the memory. Wayfinder is the guide.
