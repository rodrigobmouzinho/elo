#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="$(git config --get remote.origin.url)"

if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "Nao foi possivel identificar owner/repo a partir de remote.origin.url"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) nao encontrado."
  exit 1
fi

REPO_FULL_NAME="$OWNER/$REPO"
MAX_OPEN_CRITICAL="${MAX_OPEN_CRITICAL:-0}"
UAT_LABEL="${UAT_LABEL:-phase:uat}"
CRITICAL_LABEL="${CRITICAL_LABEL:-severity:critical}"
BUG_LABEL="${BUG_LABEL:-bug}"

OPEN_ISSUES_JSON="$(
  gh issue list \
    --repo "$REPO_FULL_NAME" \
    --state open \
    --label "$BUG_LABEL" \
    --label "$CRITICAL_LABEL" \
    --label "$UAT_LABEL" \
    --limit 200 \
    --json number,title,url
)"

OPEN_COUNT="$(echo "$OPEN_ISSUES_JSON" | jq 'length')"

echo "UAT critical bug gate"
echo "- repo: $REPO_FULL_NAME"
echo "- filtros: $BUG_LABEL + $CRITICAL_LABEL + $UAT_LABEL"
echo "- max_open_critical: $MAX_OPEN_CRITICAL"
echo "- open_critical: $OPEN_COUNT"

if [ "$OPEN_COUNT" -gt 0 ]; then
  echo "Issues criticas abertas:"
  echo "$OPEN_ISSUES_JSON" | jq -r '.[] | "- #\(.number) \(.title) (\(.url))"'
fi

if [ "$OPEN_COUNT" -gt "$MAX_OPEN_CRITICAL" ]; then
  echo "Gate reprovado: existem bugs criticos de UAT em aberto."
  exit 1
fi

echo "Gate aprovado: nenhum bug critico de UAT aberto."
