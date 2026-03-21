#!/usr/bin/env bash
set -euo pipefail

VISUAL_BASE_URL="${1:-${VISUAL_BASE_URL:-http://localhost:3001}}"
VISUAL_ROUTES="${VISUAL_ROUTES:-/login,/,/membros,/perfil,/projetos,/gamificacao}"
VISUAL_BASELINE_DIR="${VISUAL_BASELINE_DIR:-docs/qa/visual-baseline/pwa}"
VISUAL_CURRENT_DIR="${VISUAL_CURRENT_DIR:-reports/visual-current/pwa}"
VISUAL_DIFF_DIR="${VISUAL_DIFF_DIR:-reports/visual-diff/pwa}"
VISUAL_UPDATE_BASELINE="${VISUAL_UPDATE_BASELINE:-false}"
VISUAL_ALLOW_MISSING_BASELINE="${VISUAL_ALLOW_MISSING_BASELINE:-false}"
VISUAL_WAIT_MS="${VISUAL_WAIT_MS:-1500}"
VISUAL_FULL_PAGE="${VISUAL_FULL_PAGE:-true}"

mkdir -p "$VISUAL_BASELINE_DIR" "$VISUAL_CURRENT_DIR" "$VISUAL_DIFF_DIR"

if ! command -v shasum >/dev/null 2>&1; then
  echo "Comando shasum nao encontrado."
  exit 1
fi

echo "Instalando navegador Chromium do Playwright (se necessario)..."
npx --yes playwright@1.54.2 install chromium >/dev/null

IFS=',' read -r -a ROUTES_ARRAY <<<"$VISUAL_ROUTES"
FAILURES=()

slug_from_route() {
  local route="$1"
  local slug="${route#/}"
  slug="${slug//\//-}"
  slug="${slug//\?/-}"
  slug="${slug//&/-}"
  slug="${slug//=/-}"
  if [ -z "$slug" ]; then
    slug="home"
  fi
  echo "$slug"
}

for raw_route in "${ROUTES_ARRAY[@]}"; do
  route="$(echo "$raw_route" | xargs)"
  if [ -z "$route" ]; then
    continue
  fi

  if [[ "$route" != /* ]]; then
    route="/$route"
  fi

  slug="$(slug_from_route "$route")"
  current_file="$VISUAL_CURRENT_DIR/$slug.png"
  baseline_file="$VISUAL_BASELINE_DIR/$slug.png"
  url="${VISUAL_BASE_URL%/}$route"

  echo "Capturando screenshot: $url"
  screenshot_cmd=(
    npx --yes playwright@1.54.2 screenshot
    --browser=chromium
    --wait-for-timeout="$VISUAL_WAIT_MS"
  )
  if [ "$VISUAL_FULL_PAGE" = "true" ]; then
    screenshot_cmd+=(--full-page)
  fi
  screenshot_cmd+=("$url" "$current_file")
  "${screenshot_cmd[@]}"

  if [ "$VISUAL_UPDATE_BASELINE" = "true" ]; then
    cp "$current_file" "$baseline_file"
    echo "Baseline atualizado: $baseline_file"
    continue
  fi

  if [ ! -f "$baseline_file" ]; then
    if [ "$VISUAL_ALLOW_MISSING_BASELINE" = "true" ]; then
      echo "Baseline ausente para $route (permitido por VISUAL_ALLOW_MISSING_BASELINE=true)"
      continue
    fi

    FAILURES+=("missing_baseline:$slug")
    cp "$current_file" "$VISUAL_DIFF_DIR/$slug.current.png"
    continue
  fi

  current_hash="$(shasum -a 256 "$current_file" | awk '{print $1}')"
  baseline_hash="$(shasum -a 256 "$baseline_file" | awk '{print $1}')"

  if [ "$current_hash" != "$baseline_hash" ]; then
    FAILURES+=("visual_diff:$slug")
    cp "$baseline_file" "$VISUAL_DIFF_DIR/$slug.baseline.png"
    cp "$current_file" "$VISUAL_DIFF_DIR/$slug.current.png"
  fi
done

echo "Visual regression:"
echo "- base_url: $VISUAL_BASE_URL"
echo "- routes: $VISUAL_ROUTES"
echo "- baseline_dir: $VISUAL_BASELINE_DIR"
echo "- current_dir: $VISUAL_CURRENT_DIR"
echo "- diff_dir: $VISUAL_DIFF_DIR"

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "Falha no gate de regressao visual: ${FAILURES[*]}"
  echo "Compare os arquivos baseline/current em $VISUAL_DIFF_DIR."
  exit 1
fi

echo "Gate de regressao visual aprovado."
