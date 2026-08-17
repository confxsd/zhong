#!/usr/bin/env bash
set -euo pipefail

# Build the web UI in the monorepo root and sync dist -> apps/cloud/public.
# Runs from anywhere: `npm run sync:web` inside apps/cloud, or
# `npm run sync:web -w @zhong/cloud` from the repo root.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"

echo "Building web app ..."
(cd "$ROOT" && npm run build -w @zhong/web)

echo "Syncing web dist -> $DIR/public"
rm -rf "$DIR"/public/*
cp -R "$ROOT/apps/web/dist/." "$DIR/public/"
echo "Done."
