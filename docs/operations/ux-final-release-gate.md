# Gate Final UX/UI + Release/Rollback

## Objetivo
Concentrar a validacao final da refatoracao UX/UI em um gate unico com:
- regressao visual do PWA
- acessibilidade (a11y)
- performance (Lighthouse)
- gate de UAT critico
- gate de rollback/recovery

## Comando padrao
```bash
PWA_AUDIT_URL=https://<staging-pwa-url>/login \
PWA_A11Y_URL=https://<staging-pwa-url>/login \
VISUAL_BASE_URL=https://<staging-pwa-url> \
ROLLBACK_HEALTH_URL=https://<api-url>/api/health \
pnpm qa:ux-final-gate
```

## Scripts envolvidos
- `scripts/ux_final_release_gate.sh`
- `scripts/pwa_lighthouse_audit.sh`
- `scripts/pwa_accessibility_audit.sh`
- `scripts/pwa_visual_regression.sh`
- `scripts/uat_critical_gate.sh`
- `scripts/rollback_recovery_gate.sh`

## Regressao visual
### Rotas padrao auditadas
- `/login`
- `/`
- `/membros`
- `/perfil`
- `/projetos`
- `/gamificacao`

### Baseline visual
- Pasta baseline: `docs/qa/visual-baseline/pwa`
- Capturas atuais: `reports/visual-current/pwa`
- Diferenas detectadas: `reports/visual-diff/pwa`

Para inicializar/atualizar baseline:
```bash
VISUAL_BASE_URL=https://<staging-pwa-url> \
VISUAL_UPDATE_BASELINE=true \
pnpm qa:visual-regression
```

## Gate de acessibilidade
Comando:
```bash
PWA_A11Y_URL=https://<staging-pwa-url>/login pnpm qa:pwa-a11y
```

Defaults:
- `MIN_ACCESSIBILITY_SCORE=0.9`
- report: `reports/lighthouse-pwa-a11y.json`

## Gate de performance
Comando:
```bash
PWA_AUDIT_URL=https://<staging-pwa-url>/login pnpm qa:pwa-performance
```

Defaults:
- `MIN_PERFORMANCE_SCORE=0.75`
- `MAX_LCP_MS=3000`
- `MAX_CLS=0.1`
- `MAX_TBT_MS=300`

## Gate de rollback
Comando:
```bash
ROLLBACK_HEALTH_URL=https://<api-url>/api/health \
MAX_RESTORE_MINUTES=5 \
pnpm qa:rollback-gate
```

## Workflow no GitHub Actions
- Workflow manual: `.github/workflows/ux-final-release-gate.yml`
- Inputs principais:
  - `pwa_base_url`
  - `pwa_performance_url`
  - `api_health_url`
- Artefatos: `reports/**` (Lighthouse + visual current/diff)
