#!/usr/bin/env bash
set -euo pipefail

# Minimal local preview flow for workforce-console
# Usage: ./scripts/preview_frontend.sh
# Requires: pnpm installed and node runtime

echo "Building @workspace/workforce-console..."
export PORT=${PORT:-5173}
export BASE_PATH=${BASE_PATH:-/}

pnpm --filter @workspace/workforce-console run build

echo "Copying built files to ./dist/"
rsync -av --delete artifacts/workforce-console/dist/public/ ./dist/

export FRONTEND_DIST_DIR="$(pwd)/dist"

echo "Starting Flask static server (app.py) serving $FRONTEND_DIST_DIR on http://0.0.0.0:5000"
python -m flask --app app run --host=0.0.0.0 --port=5000
