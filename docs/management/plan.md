# Plano Vivo - Elo Networking

## Periodo alvo MVP
- Inicio: 16/03/2026
- Go-live alvo: 07/06/2026

## Milestones
- M1 Setup (16/03 a 29/03)
- M2 Core (30/03 a 19/04)
- M3 MVP (20/04 a 17/05)
- M4 Beta (18/05 a 07/06)
- M5 Scale (08/06 a 05/07)
- M7 Total UX Refactor (apos estabilizacao funcional do MVP)

## Cadencia
- Daily: 15 min
- Planning: semanal
- Review + Demo: quinzenal
- Retro: quinzenal

## KPIs de acompanhamento
- Velocidade por sprint
- Lead time por card
- Taxa de regressao
- Bugs criticos em producao
- Aderencia ao cronograma por milestone

## Diretrizes vigentes (15/03/2026)
- Prioridade de entrega: `Finance-first`
- Trilha financeira ativa: `manual_pix` com QR dinamico e confirmacao manual no admin
- Ordem de execucao curto prazo:
  1. Executar ELO-013 (remocao total de ASAAS + PIX manual QR dinamico)
  2. Consolidar reset de senha com Resend em ambiente real
  3. Publicar staging de `elo-pwa` na Vercel para validar fluxos mobile completos
  4. Preparar entrada de ELO-030 e ELO-041 apos validacao financeira
- Provedor de e-mail transacional oficial: `Resend`

## Programa de refatoracao total da interface
- Trilha dedicada de backlog: `ELO-071` ate `ELO-087`
- Ordem de execucao:
  1. Auditoria, arquitetura e microcopy
  2. Fundacao visual, primitives e shells
  3. Refatoracao Admin por modulo
  4. Refatoracao PWA por jornada
  5. QA total de UX/UI com regressao visual
- Regra de execucao: nao iniciar modulos de tela antes de estabilizar `ELO-074`, `ELO-075` e `ELO-076`
