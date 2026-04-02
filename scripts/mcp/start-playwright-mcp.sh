#!/usr/bin/env bash
set -euo pipefail

# Start a local Playwright "MCP"-style workflow for Copilot/automation sessions.
# Usage: ./scripts/mcp/start-playwright-mcp.sh

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

# Ensure pnpm is available
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install pnpm first: https://pnpm.io/installation"
  exit 1
fi

echo "Installing workspace dependencies (pnpm install)..."
pnpm install --silent

echo "Installing Playwright browsers..."
# Use pnpm exec to run the local playwright binary
pnpm exec playwright install --with-deps

echo "Starting Playwright tests in watch mode. Press Ctrl-C to stop."
# Run Playwright in watch mode so Copilot or a dev can interact with the browser harness.
pnpm exec playwright test --watch
