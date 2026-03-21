#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${1:-${ROLLBACK_HEALTH_URL:-}}"
MAX_RESTORE_MINUTES="${MAX_RESTORE_MINUTES:-5}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-10}"
EXPECTED_BODY_CONTAINS="${ROLLBACK_EXPECT_BODY:-}"

if [ -z "$HEALTH_URL" ]; then
  echo "Informe ROLLBACK_HEALTH_URL (ou primeiro argumento) para validar restauracao."
  exit 1
fi

if ! [[ "$MAX_RESTORE_MINUTES" =~ ^[0-9]+$ ]] || [ "$MAX_RESTORE_MINUTES" -le 0 ]; then
  echo "MAX_RESTORE_MINUTES precisa ser inteiro positivo."
  exit 1
fi

if ! [[ "$POLL_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [ "$POLL_INTERVAL_SECONDS" -le 0 ]; then
  echo "POLL_INTERVAL_SECONDS precisa ser inteiro positivo."
  exit 1
fi

START_EPOCH="$(date +%s)"
DEADLINE_EPOCH="$((START_EPOCH + MAX_RESTORE_MINUTES * 60))"

echo "Rollback recovery gate"
echo "- health_url: $HEALTH_URL"
echo "- max_restore_minutes: $MAX_RESTORE_MINUTES"
echo "- poll_interval_seconds: $POLL_INTERVAL_SECONDS"
if [ -n "$EXPECTED_BODY_CONTAINS" ]; then
  echo "- expected_body_contains: $EXPECTED_BODY_CONTAINS"
fi

ATTEMPT=0

while true; do
  ATTEMPT="$((ATTEMPT + 1))"
  NOW_EPOCH="$(date +%s)"

  if [ "$NOW_EPOCH" -gt "$DEADLINE_EPOCH" ]; then
    echo "Gate reprovado: restauracao nao ocorreu em ate $MAX_RESTORE_MINUTES minuto(s)."
    exit 1
  fi

  RESPONSE_FILE="$(mktemp -t rollback-health-XXXXXX.txt)"
  HTTP_CODE="$(
    curl -sS --max-time 10 -o "$RESPONSE_FILE" -w "%{http_code}" "$HEALTH_URL" || true
  )"

  if [ "$HTTP_CODE" = "200" ]; then
    if [ -n "$EXPECTED_BODY_CONTAINS" ]; then
      if ! grep -F "$EXPECTED_BODY_CONTAINS" "$RESPONSE_FILE" >/dev/null 2>&1; then
        rm -f "$RESPONSE_FILE"
        echo "Tentativa $ATTEMPT: HTTP 200, mas marcador esperado nao encontrado."
        sleep "$POLL_INTERVAL_SECONDS"
        continue
      fi
    fi

    RESTORED_EPOCH="$(date +%s)"
    ELAPSED_SECONDS="$((RESTORED_EPOCH - START_EPOCH))"
    ELAPSED_MINUTES="$(awk -v seconds="$ELAPSED_SECONDS" 'BEGIN { printf "%.2f", seconds / 60 }')"

    echo "Gate aprovado: restauracao confirmada."
    echo "- attempts: $ATTEMPT"
    echo "- elapsed_seconds: $ELAPSED_SECONDS"
    echo "- elapsed_minutes: $ELAPSED_MINUTES"
    rm -f "$RESPONSE_FILE"
    exit 0
  fi

  rm -f "$RESPONSE_FILE"
  echo "Tentativa $ATTEMPT: status HTTP $HTTP_CODE, aguardando restauracao..."
  sleep "$POLL_INTERVAL_SECONDS"
done
