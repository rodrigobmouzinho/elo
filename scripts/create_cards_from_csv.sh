#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$SCRIPT_DIR/sync_github_project_cards.sh" "${1:-docs/backlog/backlog.csv}"
