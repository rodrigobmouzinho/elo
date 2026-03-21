# Runbooks Operacionais

## Incidente de login
- Verificar Supabase Auth status
- Conferir env vars `NEXT_PUBLIC_SUPABASE_URL` e chaves
- Conferir `NEXT_PUBLIC_API_URL` no projeto do frontend (`elo-pwa`/`elo-admin`) apontando para o dominio da API (sem `/api`)
- Validar taxa de erro no Sentry

## Incidente de pagamentos
- Verificar fila de pendencias em `/admin/financeiro`
- Exportar CSV em `/admin/financeiro` para auditar totais e inadimplencia por periodo
- Confirmar variaveis `MANUAL_PIX_KEY`, `MANUAL_PIX_BENEFICIARY` e `MANUAL_PAYMENT_PROOF_CONTACT`
- Validar se aprovacoes recentes atualizaram `event_payments`/`membership_payments` para `paid`

## Degradacao de performance PWA
- Executar `pnpm qa:pwa-performance` (ou `PWA_AUDIT_URL=<staging-url>/login pnpm qa:pwa-performance`)
- Revisar payload de lista de eventos/membros
- Ativar cache para consultas de leitura frequente
- Referencia: `docs/operations/pwa-performance-lighthouse.md`

## UAT Beta com admins
- Executar roteiro de beta em `docs/operations/uat-admins-elo.md`
- Registrar bug critico com template `UAT Critical Bug` e labels `bug`, `severity:critical`, `phase:uat`
- Validar gate: `pnpm qa:uat-gate`
- Somente fechar ciclo beta com gate aprovado

## Incidente de release (rollback)
- Acionar o roteiro `docs/operations/release-rollback.md`
- Executar gate de recuperacao: `pnpm qa:rollback-gate`
- Confirmar restauracao em ate 5 minutos
- Registrar evidencia do tempo de restauracao no incidente
