#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-${PWA_AUDIT_URL:-http://localhost:3001/login}}"
MIN_PERFORMANCE_SCORE="${MIN_PERFORMANCE_SCORE:-0.75}"
MAX_LCP_MS="${MAX_LCP_MS:-3000}"
MAX_CLS="${MAX_CLS:-0.1}"
MAX_TBT_MS="${MAX_TBT_MS:-300}"
REPORT_PATH="${LIGHTHOUSE_REPORT_PATH:-reports/lighthouse-pwa.json}"

mkdir -p "$(dirname "$REPORT_PATH")"
TMP_REPORT="$(mktemp -t pwa-lighthouse-XXXXXX.json)"

echo "Rodando Lighthouse em: $TARGET_URL"
npx --yes lighthouse "$TARGET_URL" \
  --quiet \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu" \
  --only-categories=performance \
  --output=json \
  --output-path="$TMP_REPORT"

mv "$TMP_REPORT" "$REPORT_PATH"

read -r SCORE LCP CLS TBT <<EOF
$(node -e '
  const fs = require("fs");
  const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const score = Number(report.categories?.performance?.score ?? 0);
  const lcp = Number(report.audits?.["largest-contentful-paint"]?.numericValue ?? 0);
  const cls = Number(report.audits?.["cumulative-layout-shift"]?.numericValue ?? 0);
  const tbt = Number(report.audits?.["total-blocking-time"]?.numericValue ?? 0);
  process.stdout.write(`${score} ${lcp} ${cls} ${tbt}`);
' "$REPORT_PATH")
EOF

echo "Resultado Lighthouse:"
echo "- score(performance): $SCORE"
echo "- LCP(ms): $LCP"
echo "- CLS: $CLS"
echo "- TBT(ms): $TBT"
echo "- report: $REPORT_PATH"

FAILURES=()

if ! awk -v score="$SCORE" -v min="$MIN_PERFORMANCE_SCORE" 'BEGIN { exit !(score >= min) }'; then
  FAILURES+=("performance_score<$MIN_PERFORMANCE_SCORE")
fi

if ! awk -v lcp="$LCP" -v max="$MAX_LCP_MS" 'BEGIN { exit !(lcp <= max) }'; then
  FAILURES+=("lcp_ms>$MAX_LCP_MS")
fi

if ! awk -v cls="$CLS" -v max="$MAX_CLS" 'BEGIN { exit !(cls <= max) }'; then
  FAILURES+=("cls>$MAX_CLS")
fi

if ! awk -v tbt="$TBT" -v max="$MAX_TBT_MS" 'BEGIN { exit !(tbt <= max) }'; then
  FAILURES+=("tbt_ms>$MAX_TBT_MS")
fi

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "Falha no budget de performance: ${FAILURES[*]}"
  exit 1
fi

echo "Budget de performance atendido."
