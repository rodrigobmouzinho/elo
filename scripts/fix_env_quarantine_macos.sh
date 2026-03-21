#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is for macOS only."
  exit 0
fi

ENV_COUNT=0
CHANGED=0

while IFS= read -r -d '' file; do
  ENV_COUNT=$((ENV_COUNT + 1))
  sanitized=0

  for attr in "com.apple.quarantine" "com.apple.LaunchServices.OpenWith" "com.apple.lastuseddate#PS"; do
    if xattr -p "$attr" "$file" >/dev/null 2>&1; then
      xattr -d "$attr" "$file" || true
      sanitized=1
    fi
  done

  if [[ "$sanitized" -eq 1 ]]; then
    CHANGED=1
    echo "sanitized: $file"
  fi
done < <(
  find "$ROOT_DIR" \
    \( -path "*/.git/*" -o -path "*/node_modules/*" \) -prune -o \
    -type f \( -name ".env" -o -name ".env.*" -o -name "*.env" -o -name "*.env.*" \) \
    -print0
)

if [[ "$ENV_COUNT" -eq 0 ]]; then
  echo "No .env files found."
  exit 0
fi

if [[ "$CHANGED" -eq 0 ]]; then
  echo "No blocking attributes found on .env files."
else
  echo "Done. You can open .env files normally now."
fi
