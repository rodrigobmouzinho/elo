# Status Atual do Programa

Data de referencia: 16/03/2026

## Progresso por milestone
- M1 Setup: **98%**
- M2 Core: **52%**
- M3 MVP: **22%**
- M4 Beta: 0%
- M5 Scale: 0%

## Concluido nesta entrega
- Monorepo e apps base criados
- Contrato inicial de API implementado e expandido
- Design system inicial e layout mobile/admin
- Documentacao executiva (PRD, arquitetura, ADRs, backlog, governanca)
- CI baseline e playbooks operacionais
- Schema inicial do Supabase (migracao)
- JWT real com Supabase e RBAC por role
- Frontends Admin/PWA conectados a API (login, sessão, dados, ações)
- Fluxo `manual_pix` para anuidade/eventos com aprovacao admin
- Script de bootstrap para vínculo `auth.users` -> `member_profiles.auth_user_id` e carga inicial de `user_roles`
- Testes de integração da API para login, checkout e aprovação manual (Vitest)
- Preview deploy na Vercel para `admin` e `api` (com links de claim)
- Validação local completa no novo diretório: `pnpm lint && pnpm test && pnpm build` (verde)
- Estratégia oficial definida: `Finance-first` (pagamentos antes de novas features de produto)
- Decisão de e-mail transacional consolidada: `Resend`
- Endpoint de status de checkout implementado: `GET /api/app/events/:id/checkout-status`
- PWA com polling de pagamento para feedback em tempo real e confirmação automática de presença
- Checkout com prevenção de duplicidade (reuso de cobrança pendente)
- Fluxo de reset de senha com Resend + fallback para Supabase Auth
- Repositório publicado no GitHub: `rodrigobmouzinho/elo-networking` (public)
- Branch protection aplicada em `main` (PR obrigatório + 1 aprovação + sem force push/deletion)
- GitHub Project criado e cards priorizados (ELO-023, ELO-013, ELO-010, ELO-020)
- Supabase staging linkado no CLI e migrations aplicadas com sucesso
- Seed remoto executado (`supabase/seed.sql`)
- Fluxo de pagamentos `manual_pix` entregue:
  - checkout de evento sem gateway externo
  - instruções PIX exibidas no PWA
  - aprovação manual no admin para eventos e anuidades
- ELO-010 entregue e mergeado (PR #5): CRUD de membros com persistencia Supabase
- ELO-020 entregue e mergeado (PR #6): CRUD de eventos com media upload/fallback
- ELO-023 validado em staging (15/03/2026): checkout manual PIX -> aprovacao admin -> checkout-status `paid` + presenca confirmada
- ELO-054 concluido (16/03/2026): textos do produto revisados em pt-BR com acentuação consistente (PWA/Admin/API + testes correlatos)
- Governanca sincronizada no GitHub Project:
  - ELO-020 em `Done` + `status:done`
  - ELO-013 em `Todo` + `status:next` (remocao total ASAAS + QR dinamico)
  - ELO-023 em `Done` + `status:done`
- Bootstrap Auth/RBAC em staging concluído com auditoria:
  - `usersTotal=5`
  - `membersTotal=2`
  - `linkedCount=2`
  - `adminRoleUpserts=3`
  - `memberRoleUpserts=2`

## Em andamento
- ELO-013: remocao total do ASAAS e consolidacao de `manual_pix` com QR dinamico
- Consolidacao de reset de senha com Resend em ambiente real
- Preparacao de deploy `elo-pwa` em staging na Vercel

## Proximos passos imediatos
1. Configurar `RESEND_API_KEY`, `EMAIL_FROM` e executar smoke test de reset de senha em staging
2. Publicar deploy de `elo-pwa` em staging para cobertura visual do fluxo mobile
3. Concluir ELO-013 e atualizar GitHub Project para avancar ao proximo card da fila fixa
4. Iniciar planejamento tecnico de ELO-030 e ELO-041
