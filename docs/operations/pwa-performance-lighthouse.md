# QA de Performance PWA (Lighthouse)

## Objetivo
Executar auditoria de performance no build de staging do PWA e validar metas minimas.

## Comando padrao
```bash
PWA_AUDIT_URL=https://<staging-pwa-url>/login pnpm qa:pwa-performance
```

## Budget padrao (defaults)
- `MIN_PERFORMANCE_SCORE=0.75`
- `MAX_LCP_MS=3000`
- `MAX_CLS=0.1`
- `MAX_TBT_MS=300`

## Overrides opcionais
```bash
PWA_AUDIT_URL=https://<staging-pwa-url>/login \
MIN_PERFORMANCE_SCORE=0.8 \
MAX_LCP_MS=2800 \
MAX_CLS=0.08 \
MAX_TBT_MS=250 \
LIGHTHOUSE_REPORT_PATH=reports/lighthouse-pwa-staging.json \
pnpm qa:pwa-performance
```

## Saida esperada
- Report JSON em `reports/lighthouse-pwa.json` (ou caminho customizado).
- Retorno `0` quando todos os limites sao atendidos.
- Retorno `1` quando algum limite estoura (falha de gate de performance).

## Script oficial
- `scripts/pwa_lighthouse_audit.sh`

## Execucao via GitHub Actions
- Workflow manual: `.github/workflows/pwa-performance-qa.yml`
- Input obrigatorio: `target_url` (staging do PWA com rota publica, ex: `/login`)

## Relacao com gate final de release
- A auditoria de performance tambem e executada dentro do gate unificado `pnpm qa:ux-final-gate`.
- Referencia: `docs/operations/ux-final-release-gate.md`
