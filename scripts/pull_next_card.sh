#!/usr/bin/env bash
set -euo pipefail

DONE_CARD_ID="${1:-}"
PROJECT_NUMBER="${PROJECT_NUMBER:-1}"
SYNC_PROJECT_STATUS="${SYNC_PROJECT_STATUS:-false}"
REMOTE_URL="$(git config --get remote.origin.url)"

if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "Nao foi possivel identificar owner/repo a partir de remote.origin.url"
  exit 1
fi

REPO_FULL_NAME="$OWNER/$REPO"

PROJECT_ID=""
STATUS_FIELD_ID=""
STATUS_IN_PROGRESS_OPTION_ID=""
STATUS_DONE_OPTION_ID=""

if [ "$SYNC_PROJECT_STATUS" = "true" ]; then
  PROJECT_ID="$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.number==$PROJECT_NUMBER) | .id")"
  FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
  STATUS_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .id')"
  STATUS_IN_PROGRESS_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="In Progress") | .id')"
  STATUS_DONE_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Done") | .id')"
fi

QUEUE=(
  "ELO-013" "ELO-012" "ELO-011" "ELO-014" "ELO-021" "ELO-024" "ELO-022" "ELO-030"
  "ELO-031" "ELO-032" "ELO-033" "ELO-034" "ELO-040" "ELO-041" "ELO-042" "ELO-043"
  "ELO-044" "ELO-045" "ELO-046" "ELO-047" "ELO-050" "ELO-051" "ELO-052" "ELO-053"
  "ELO-054" "ELO-055" "ELO-056" "ELO-057" "ELO-058" "ELO-059" "ELO-060" "ELO-061"
  "ELO-062" "ELO-063" "ELO-064" "ELO-065" "ELO-066" "ELO-067" "ELO-068" "ELO-069"
  "ELO-070"
)

ISSUES_JSON="$(gh api --method GET "repos/$REPO_FULL_NAME/issues?state=all&per_page=100" --paginate)"

function issue_number_by_card() {
  local card_id="$1"
  echo "$ISSUES_JSON" | jq -r --arg card "$card_id" '.[] | select(.title | startswith($card)) | .number' | head -n 1
}

function issue_state_by_number() {
  local issue_number="$1"
  echo "$ISSUES_JSON" | jq -r --argjson number "$issue_number" '.[] | select(.number==$number) | .state' | head -n 1
}

function set_project_status() {
  local issue_number="$1"
  local option_id="$2"

  if [ "$SYNC_PROJECT_STATUS" != "true" ]; then
    return 0
  fi

  item_id="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json \
    --jq ".items[] | select(.content.number==$issue_number) | .id")"

  if [ -n "$item_id" ] && [ -n "$option_id" ]; then
    gh project item-edit \
      --id "$item_id" \
      --project-id "$PROJECT_ID" \
      --field-id "$STATUS_FIELD_ID" \
      --single-select-option-id "$option_id" >/dev/null
  fi
}

if [ -n "$DONE_CARD_ID" ]; then
  done_issue_number="$(issue_number_by_card "$DONE_CARD_ID")"
  if [ -z "$done_issue_number" ]; then
    echo "Card $DONE_CARD_ID nao encontrado em issues."
    exit 1
  fi

  gh api --method PATCH "repos/$REPO_FULL_NAME/issues/$done_issue_number" -f state=closed >/dev/null
  gh api -X DELETE "repos/$REPO_FULL_NAME/issues/$done_issue_number/labels/status:next" >/dev/null 2>&1 || true
  gh api -X DELETE "repos/$REPO_FULL_NAME/issues/$done_issue_number/labels/status:doing" >/dev/null 2>&1 || true
  gh api "repos/$REPO_FULL_NAME/issues/$done_issue_number/labels" -X POST -f 'labels[]=status:done' >/dev/null
  set_project_status "$done_issue_number" "$STATUS_DONE_OPTION_ID"
  echo "Card concluido: $DONE_CARD_ID (#$done_issue_number)"
fi

ISSUES_JSON="$(gh api --method GET "repos/$REPO_FULL_NAME/issues?state=all&per_page=100" --paginate)"

next_card=""
next_issue=""

for card_id in "${QUEUE[@]}"; do
  issue_number="$(issue_number_by_card "$card_id")"
  [ -z "$issue_number" ] && continue

  state="$(issue_state_by_number "$issue_number")"
  if [ "$state" = "open" ]; then
    next_card="$card_id"
    next_issue="$issue_number"
    break
  fi
done

if [ -z "$next_card" ] || [ -z "$next_issue" ]; then
  echo "Nenhum proximo card aberto na fila fixa."
  exit 0
fi

gh api -X DELETE "repos/$REPO_FULL_NAME/issues/$next_issue/labels/status:next" >/dev/null 2>&1 || true
gh api "repos/$REPO_FULL_NAME/issues/$next_issue/labels" -X POST -f 'labels[]=status:doing' >/dev/null
set_project_status "$next_issue" "$STATUS_IN_PROGRESS_OPTION_ID"

echo "Proximo card: $next_card (#$next_issue)"
