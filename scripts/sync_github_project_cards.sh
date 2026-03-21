#!/usr/bin/env bash
set -euo pipefail

CSV_PATH="${1:-docs/backlog/backlog.csv}"
PROJECT_NUMBER="${PROJECT_NUMBER:-1}"
SYNC_GITHUB_PROJECT="${SYNC_GITHUB_PROJECT:-true}"
SYNC_PROJECT_FIELDS="${SYNC_PROJECT_FIELDS:-false}"
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

if [ "$SYNC_GITHUB_PROJECT" = "true" ]; then
  PROJECT_ID="$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.number==$PROJECT_NUMBER) | .id")"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) nao encontrado."
  exit 1
fi

if [ ! -f "$CSV_PATH" ]; then
  echo "Arquivo CSV nao encontrado: $CSV_PATH"
  exit 1
fi

if [ "$SYNC_GITHUB_PROJECT" = "true" ] && [ -z "$PROJECT_ID" ]; then
  echo "Project #$PROJECT_NUMBER nao encontrado para owner $OWNER."
  exit 1
fi

DONE_INITIAL=(
  "ELO-001" "ELO-002" "ELO-003" "ELO-004" "ELO-005" "ELO-010" "ELO-020" "ELO-023"
)

function in_done_initial() {
  local target="$1"
  for card in "${DONE_INITIAL[@]}"; do
    if [ "$card" = "$target" ]; then
      return 0
    fi
  done
  return 1
}

function normalize_area_label() {
  local epic="$1"
  echo "area:$(echo "$epic" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9:-')"
}

function ensure_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if ! gh api --method GET "repos/$REPO_FULL_NAME/labels/$name" >/dev/null 2>&1; then
    gh api --method POST "repos/$REPO_FULL_NAME/labels" \
      -f name="$name" \
      -f color="$color" \
      -f description="$description" >/dev/null
  fi
}

function ensure_project_item() {
  local issue_number="$1"
  local issue_url="https://github.com/$REPO_FULL_NAME/issues/$issue_number"
  local item_id

  item_id="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json \
    --jq ".items[] | select(.content.number==$issue_number) | .id")"

  if [ -z "$item_id" ]; then
    gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$issue_url" >/dev/null
    for _ in $(seq 1 10); do
      item_id="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json \
        --jq ".items[] | select(.content.number==$issue_number) | .id")"
      [ -n "$item_id" ] && break
      sleep 1
    done
  fi

  echo "$item_id"
}

function set_single_select_field() {
  local item_id="$1"
  local field_id="$2"
  local option_id="$3"

  if [ -n "$field_id" ] && [ "$field_id" != "null" ] && [ -n "$option_id" ] && [ "$option_id" != "null" ]; then
    gh project item-edit \
      --id "$item_id" \
      --project-id "$PROJECT_ID" \
      --field-id "$field_id" \
      --single-select-option-id "$option_id" >/dev/null
  fi
}

function set_text_field() {
  local item_id="$1"
  local field_id="$2"
  local text="$3"

  if [ -n "$field_id" ] && [ "$field_id" != "null" ]; then
    gh project item-edit \
      --id "$item_id" \
      --project-id "$PROJECT_ID" \
      --field-id "$field_id" \
      --text "$text" >/dev/null
  fi
}

function set_number_field() {
  local item_id="$1"
  local field_id="$2"
  local number_value="$3"

  if [ -n "$field_id" ] && [ "$field_id" != "null" ] && [ -n "$number_value" ]; then
    gh project item-edit \
      --id "$item_id" \
      --project-id "$PROJECT_ID" \
      --field-id "$field_id" \
      --number "$number_value" >/dev/null
  fi
}

ensure_label "priority:must" "D93F0B" "Item Must do backlog"
ensure_label "priority:should" "FBCA04" "Item Should do backlog"
ensure_label "priority:could" "0E8A16" "Item Could do backlog"
ensure_label "status:next" "1D76DB" "Proxima execucao"
ensure_label "status:doing" "FBCA04" "Em execucao"
ensure_label "status:done" "0E8A16" "Concluido"
ensure_label "status:blocked" "B60205" "Dependencia externa"
ensure_label "phase:uat" "1D76DB" "Issue registrada durante UAT beta"
ensure_label "severity:critical" "B60205" "Bug critico que bloqueia operacao"

STATUS_FIELD_ID=""
MOSCOW_FIELD_ID=""
RISK_FIELD_ID=""
EPIC_FIELD_ID=""
WSJF_FIELD_ID=""
ESTIMATE_FIELD_ID=""
OWNER_FIELD_ID=""
DEPENDENCIES_FIELD_ID=""

STATUS_TODO_OPTION_ID=""
STATUS_IN_PROGRESS_OPTION_ID=""
STATUS_DONE_OPTION_ID=""
STATUS_BLOCKED_OPTION_ID=""
MOSCOW_MUST_OPTION_ID=""
MOSCOW_SHOULD_OPTION_ID=""
MOSCOW_COULD_OPTION_ID=""
RISK_LOW_OPTION_ID=""
RISK_MEDIUM_OPTION_ID=""
RISK_HIGH_OPTION_ID=""

if [ "$SYNC_PROJECT_FIELDS" = "true" ] && [ "$SYNC_GITHUB_PROJECT" = "true" ]; then
  FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json)"
  STATUS_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .id')"
  MOSCOW_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="MoSCoW") | .id')"
  RISK_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Risk") | .id')"
  EPIC_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Epic") | .id')"
  WSJF_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="WSJF") | .id')"
  ESTIMATE_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Estimate") | .id')"
  OWNER_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Owner") | .id')"
  DEPENDENCIES_FIELD_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Dependencies") | .id')"

  STATUS_TODO_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Todo") | .id')"
  STATUS_IN_PROGRESS_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="In Progress") | .id')"
  STATUS_DONE_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Done") | .id')"
  STATUS_BLOCKED_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Status") | .options[] | select(.name=="Blocked") | .id')"
  MOSCOW_MUST_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="MoSCoW") | .options[] | select(.name=="Must") | .id')"
  MOSCOW_SHOULD_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="MoSCoW") | .options[] | select(.name=="Should") | .id')"
  MOSCOW_COULD_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="MoSCoW") | .options[] | select(.name=="Could") | .id')"
  RISK_LOW_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Risk") | .options[] | select(.name=="Low") | .id')"
  RISK_MEDIUM_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Risk") | .options[] | select(.name=="Medium") | .id')"
  RISK_HIGH_OPTION_ID="$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name=="Risk") | .options[] | select(.name=="High") | .id')"
fi

MILESTONES_JSON="$(gh api "repos/$REPO_FULL_NAME/milestones")"
ISSUES_JSON="$(gh api --method GET "repos/$REPO_FULL_NAME/issues?state=all&per_page=100" --paginate)"

{
  read -r _header
  while IFS=',' read -r id epic story priority impact estimate milestone _status; do
    [ -z "$id" ] && continue

    title="$id: $story"
    area_label="$(normalize_area_label "$epic")"
    ensure_label "$area_label" "5319E7" "Cards da area $epic"

    wsjf="$(awk -F'|' -v id="$id" '$0 ~ "\\| "id" \\|" {gsub(/ /, "", $6); print $6}' docs/backlog/backlog.md | head -n 1)"
    if [ -z "$wsjf" ]; then
      wsjf="$estimate"
    fi

    gherkin="$(awk -F'|' -v id="$id" '$0 ~ "\\| "id" \\|" {print $4}' docs/backlog/backlog.md | sed 's/^ *//;s/ *$//' | head -n 1)"
    if [ -z "$gherkin" ]; then
      gherkin="Given card priorizado, When implementado, Then entrega valida o objetivo do card."
    fi

    body=$(cat <<BODY
## Objetivo
$story

## Epic
$epic

## Criterios de aceite (Given/When/Then)
$gherkin

## Prioridade
$priority

## Impacto
$impact

## Estimativa
$estimate

## Milestone
$milestone

## Checklist
- [ ] Implementar o escopo do card sem adicionar escopo extra
- [ ] Validar com \`pnpm lint && pnpm test && pnpm build\`
- [ ] Atualizar documentacao e rastreabilidade

## Referencias
- Backlog: \`docs/backlog/backlog.md\`
- Plano: \`docs/management/plan.md\`
BODY
)

    issue_number="$(echo "$ISSUES_JSON" | jq -r --arg id "$id" '.[] | select(.title | startswith($id)) | .number' | head -n 1)"

    existing_state=""
    existing_status_done="false"
    existing_status_doing="false"
    existing_status_blocked="false"

    if [ -z "$issue_number" ]; then
      issue_number="$(gh api --method POST "repos/$REPO_FULL_NAME/issues" \
        -f title="$title" \
        -f body="$body" \
        --jq '.number')"
      ISSUES_JSON="$(gh api --method GET "repos/$REPO_FULL_NAME/issues?state=all&per_page=100" --paginate)"
      echo "Issue criada: #$issue_number ($id)"
    else
      existing_state="$(echo "$ISSUES_JSON" | jq -r --argjson number "$issue_number" '.[] | select(.number==$number) | .state' | head -n 1)"
      existing_status_done="$(echo "$ISSUES_JSON" | jq -r --argjson number "$issue_number" 'any(.[] | select(.number==$number).labels[]?.name; . == "status:done")')"
      existing_status_doing="$(echo "$ISSUES_JSON" | jq -r --argjson number "$issue_number" 'any(.[] | select(.number==$number).labels[]?.name; . == "status:doing")')"
      existing_status_blocked="$(echo "$ISSUES_JSON" | jq -r --argjson number "$issue_number" 'any(.[] | select(.number==$number).labels[]?.name; . == "status:blocked")')"

      gh api --method PATCH "repos/$REPO_FULL_NAME/issues/$issue_number" \
        -f title="$title" \
        -f body="$body" >/dev/null
      echo "Issue atualizada: #$issue_number ($id)"
    fi

    milestone_number="$(echo "$MILESTONES_JSON" | jq -r --arg m "$milestone" '.[] | select(.title==$m) | .number' | head -n 1)"
    if [ -n "$milestone_number" ]; then
      gh api --method PATCH "repos/$REPO_FULL_NAME/issues/$issue_number" \
        -F milestone="$milestone_number" >/dev/null
    fi

    for label in "status:next" "status:doing" "status:done" "status:blocked" \
      "priority:must" "priority:should" "priority:could"; do
      gh api -X DELETE "repos/$REPO_FULL_NAME/issues/$issue_number/labels/$label" >/dev/null 2>&1 || true
    done

    status_label="status:next"
    target_state="open"
    status_option_id="$STATUS_TODO_OPTION_ID"
    if in_done_initial "$id" || [ "$existing_state" = "closed" ] || [ "$existing_status_done" = "true" ]; then
      status_label="status:done"
      status_option_id="$STATUS_DONE_OPTION_ID"
      target_state="closed"
    elif [ "$existing_status_doing" = "true" ]; then
      status_label="status:doing"
      status_option_id="$STATUS_IN_PROGRESS_OPTION_ID"
    elif [ "$existing_status_blocked" = "true" ]; then
      status_label="status:blocked"
      status_option_id="$STATUS_BLOCKED_OPTION_ID"
      if [ -z "$status_option_id" ] || [ "$status_option_id" = "null" ]; then
        status_option_id="$STATUS_TODO_OPTION_ID"
      fi
    fi

    if [ "$target_state" = "closed" ]; then
      gh api --method PATCH "repos/$REPO_FULL_NAME/issues/$issue_number" -f state=closed >/dev/null
    else
      gh api --method PATCH "repos/$REPO_FULL_NAME/issues/$issue_number" -f state=open >/dev/null
    fi

    priority_lower="$(echo "$priority" | tr '[:upper:]' '[:lower:]')"
    gh api "repos/$REPO_FULL_NAME/issues/$issue_number/labels" -X POST \
      -f "labels[]=$area_label" \
      -f "labels[]=priority:$priority_lower" \
      -f "labels[]=$status_label" >/dev/null

    if [ "$SYNC_GITHUB_PROJECT" = "true" ]; then
      gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" \
        --url "https://github.com/$REPO_FULL_NAME/issues/$issue_number" >/dev/null 2>&1 || true
    fi

    if [ "$SYNC_PROJECT_FIELDS" = "true" ] && [ "$SYNC_GITHUB_PROJECT" = "true" ]; then
      item_id="$(ensure_project_item "$issue_number")"

      if [ -z "$item_id" ]; then
        echo "Falha ao localizar item de projeto para issue #$issue_number"
        exit 1
      fi

      set_single_select_field "$item_id" "$STATUS_FIELD_ID" "$status_option_id"

      case "$priority" in
        Must) set_single_select_field "$item_id" "$MOSCOW_FIELD_ID" "$MOSCOW_MUST_OPTION_ID" ;;
        Should) set_single_select_field "$item_id" "$MOSCOW_FIELD_ID" "$MOSCOW_SHOULD_OPTION_ID" ;;
        Could) set_single_select_field "$item_id" "$MOSCOW_FIELD_ID" "$MOSCOW_COULD_OPTION_ID" ;;
      esac

      case "$impact" in
        High|MediumHigh) set_single_select_field "$item_id" "$RISK_FIELD_ID" "$RISK_HIGH_OPTION_ID" ;;
        Medium) set_single_select_field "$item_id" "$RISK_FIELD_ID" "$RISK_MEDIUM_OPTION_ID" ;;
        *) set_single_select_field "$item_id" "$RISK_FIELD_ID" "$RISK_LOW_OPTION_ID" ;;
      esac

      set_text_field "$item_id" "$EPIC_FIELD_ID" "$epic"
      set_number_field "$item_id" "$WSJF_FIELD_ID" "$wsjf"
      set_number_field "$item_id" "$ESTIMATE_FIELD_ID" "$estimate"
      set_text_field "$item_id" "$OWNER_FIELD_ID" "$OWNER"
      set_text_field "$item_id" "$DEPENDENCIES_FIELD_ID" "Seguir fila fixa definida em AGENTS.md"
    fi
  done
} < "$CSV_PATH"

if [ "$SYNC_GITHUB_PROJECT" = "true" ]; then
  echo "Sincronizacao concluida para project #$PROJECT_NUMBER ($OWNER/$REPO)."
else
  echo "Sincronizacao de issues concluida (modo sem GitHub Project)."
fi
