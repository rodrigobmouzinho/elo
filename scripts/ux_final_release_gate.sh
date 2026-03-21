#!/usr/bin/env bash
set -euo pipefail

PWA_AUDIT_URL="${PWA_AUDIT_URL:-http://localhost:3001/login}"
PWA_A11Y_URL="${PWA_A11Y_URL:-$PWA_AUDIT_URL}"
VISUAL_BASE_URL="${VISUAL_BASE_URL:-}"
ROLLBACK_HEALTH_URL="${ROLLBACK_HEALTH_URL:-}"
MAX_RESTORE_MINUTES="${MAX_RESTORE_MINUTES:-5}"
ROLLBACK_EXPECT_BODY="${ROLLBACK_EXPECT_BODY:-}"

if [ -z "$VISUAL_BASE_URL" ]; then
  VISUAL_BASE_URL="$(
    node -e '
      const raw = process.argv[1];
      try {
        const url = new URL(raw);
        process.stdout.write(`${url.protocol}//${url.host}`);
      } catch {
        process.stdout.write("");
      }
    ' "$PWA_AUDIT_URL"
  )"
fi

if [ -z "$VISUAL_BASE_URL" ]; then
  echo "Informe VISUAL_BASE_URL para o gate de regressao visual."
  exit 1
fi

if [ -z "$ROLLBACK_HEALTH_URL" ]; then
  echo "Informe ROLLBACK_HEALTH_URL para validar release + rollback."
  exit 1
fi

echo "Executando gate final UX/UI + release/rollback"
echo "- pwa_audit_url: $PWA_AUDIT_URL"
echo "- pwa_a11y_url: $PWA_A11Y_URL"
echo "- visual_base_url: $VISUAL_BASE_URL"
echo "- rollback_health_url: $ROLLBACK_HEALTH_URL"
echo "- max_restore_minutes: $MAX_RESTORE_MINUTES"

pnpm lint
pnpm test
pnpm build

PWA_AUDIT_URL="$PWA_AUDIT_URL" pnpm qa:pwa-performance
PWA_A11Y_URL="$PWA_A11Y_URL" pnpm qa:pwa-a11y
VISUAL_BASE_URL="$VISUAL_BASE_URL" pnpm qa:visual-regression
pnpm qa:uat-gate
ROLLBACK_HEALTH_URL="$ROLLBACK_HEALTH_URL" \
MAX_RESTORE_MINUTES="$MAX_RESTORE_MINUTES" \
ROLLBACK_EXPECT_BODY="$ROLLBACK_EXPECT_BODY" \
pnpm qa:rollback-gate

echo "Gate final UX/UI + release/rollback aprovado."
