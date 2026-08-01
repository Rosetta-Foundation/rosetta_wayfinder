#!/usr/bin/env bash
set -euo pipefail

# Local process sandbox for rosetta_wayfinder (.sdlc/environments.json).
# "Deploying" this repo means building the Vite frontend from the task
# worktree and staging the artifact keyed by the deployed SHA. The engine
# provides SDLC_SANDBOX_SHA; health must report it back (SPEC-PRD-0011-P2
# T-03 contract). The Tauri native shell is not built here — the frontend
# bundle is the sandbox artifact.

SANDBOX_DIR="${SDLC_SANDBOX_DIR:-$HOME/.rosetta/sandbox/rosetta_wayfinder}"

bun install --frozen-lockfile >/dev/null
bun run build >/dev/null

mkdir -p "$SANDBOX_DIR"
rm -rf "$SANDBOX_DIR/dist"
cp -R dist "$SANDBOX_DIR/dist"
printf '%s' "$SDLC_SANDBOX_SHA" > "$SANDBOX_DIR/deployed-sha"

echo "deployed $SDLC_SANDBOX_SHA to $SANDBOX_DIR"
