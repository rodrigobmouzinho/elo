# Playbook Release e Rollback

## Release
1. Freeze de escopo da sprint.
2. Executar `pnpm lint && pnpm test && pnpm build`.
3. Executar gate final UX/UI:
   ```bash
   PWA_AUDIT_URL=https://<staging-pwa-url>/login \
   PWA_A11Y_URL=https://<staging-pwa-url>/login \
   VISUAL_BASE_URL=https://<staging-pwa-url> \
   ROLLBACK_HEALTH_URL=https://<api-url>/api/health \
   pnpm qa:ux-final-gate
   ```
4. Validar smoke tests em staging.
5. Criar tag de release (`vX.Y.Z`).
6. Publicar deploy production via Vercel.

## Rollback
1. Abrir incidente e registrar `T0` (inicio do rollback).
2. Identificar ultimo deployment saudavel no projeto da Vercel.
3. Reapontar producao para o deployment anterior (promote do deployment saudavel).
4. Executar gate de recuperacao:
   ```bash
   ROLLBACK_HEALTH_URL=https://<api-producao>/api/health MAX_RESTORE_MINUTES=5 pnpm qa:rollback-gate
   ```
5. Validar fluxos criticos (login, eventos, financeiro).
6. Registrar `RCA` com causa raiz e acao preventiva.

## Checklist critico
- Auth funcionando
- Lista de eventos carregando
- Confirmacao de presenca funcionando
- Pendencias de pagamento sendo aprovadas e refletidas no status de checkout

## Criterio de sucesso do rollback
- Restauracao confirmada em ate `5` minutos via `qa:rollback-gate`.
- Sem bugs criticos de UAT abertos (`pnpm qa:uat-gate`).

## Automacao disponivel
- Script local: `scripts/rollback_recovery_gate.sh`
- Workflow manual: `.github/workflows/rollback-recovery-gate.yml`
- Gate final integrado: `scripts/ux_final_release_gate.sh`
- Workflow manual final: `.github/workflows/ux-final-release-gate.yml`
