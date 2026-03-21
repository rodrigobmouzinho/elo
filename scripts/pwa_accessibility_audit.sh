#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-${PWA_A11Y_URL:-http://localhost:3001/login}}"
MIN_ACCESSIBILITY_SCORE="${MIN_ACCESSIBILITY_SCORE:-0.9}"
A11Y_REPORT_PATH="${A11Y_REPORT_PATH:-reports/lighthouse-pwa-a11y.json}"
A11Y_REQUIRED_AUDITS="${A11Y_REQUIRED_AUDITS:-aria-allowed-attr,aria-command-name,aria-input-field-name,aria-required-attr,button-name,color-contrast,document-title,html-has-lang,image-alt,label,link-name,meta-viewport}"

mkdir -p "$(dirname "$A11Y_REPORT_PATH")"
TMP_REPORT="$(mktemp -t pwa-a11y-XXXXXX.json)"

echo "Rodando Lighthouse (acessibilidade) em: $TARGET_URL"
npx --yes lighthouse "$TARGET_URL" \
  --quiet \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu" \
  --only-categories=accessibility \
  --output=json \
  --output-path="$TMP_REPORT"

mv "$TMP_REPORT" "$A11Y_REPORT_PATH"

mapfile -t ANALYSIS < <(node -e '
  const fs = require("fs");
  const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const required = (process.argv[2] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const score = Number(report.categories?.accessibility?.score ?? 0);
  const failed = required.filter((auditId) => {
    const audit = report.audits?.[auditId];
    if (!audit) return true;
    if (audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") return false;
    return Number(audit.score ?? 0) < 1;
  });
  console.log(score);
  console.log(failed.join(","));
' "$A11Y_REPORT_PATH" "$A11Y_REQUIRED_AUDITS")

ACCESSIBILITY_SCORE="${ANALYSIS[0]:-0}"
FAILED_AUDITS="${ANALYSIS[1]:-}"

echo "Resultado Lighthouse (a11y):"
echo "- score(accessibility): $ACCESSIBILITY_SCORE"
echo "- report: $A11Y_REPORT_PATH"

FAILURES=()

if ! awk -v score="$ACCESSIBILITY_SCORE" -v min="$MIN_ACCESSIBILITY_SCORE" 'BEGIN { exit !(score >= min) }'; then
  FAILURES+=("accessibility_score<$MIN_ACCESSIBILITY_SCORE")
fi

if [ -n "$FAILED_AUDITS" ]; then
  FAILURES+=("required_audits_failed:$FAILED_AUDITS")
fi

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "Falha no gate de acessibilidade: ${FAILURES[*]}"
  exit 1
fi

echo "Gate de acessibilidade aprovado."
