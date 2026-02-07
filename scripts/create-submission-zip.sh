#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist-submission"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/ticketing-system-weve-${STAMP}.zip"
TMP_FILE="$(mktemp)"

mkdir -p "$OUT_DIR"

cd "$ROOT_DIR"

# Include only Git-tracked source files from the current working tree.
git ls-files > "$TMP_FILE"
zip -q "$OUT_FILE" -@ < "$TMP_FILE"
rm -f "$TMP_FILE"

echo "Created: $OUT_FILE"
