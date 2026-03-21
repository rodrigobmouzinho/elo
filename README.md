# Elo Networking Platform

Monorepo do MVP Elo Networking com três apps principais:

- `apps/admin`: painel administrativo
- `apps/pwa`: aplicativo PWA mobile para membros
- `apps/api`: BFF/API com Route Handlers

## Stack

- Next.js 15 (App Router)
- Supabase (Auth, Postgres, Storage)
- Turborepo + PNPM Workspaces
- Vercel (preview/prod)

## Comandos padrão

```bash
pnpm install
pnpm run      # desenvolvimento
pnpm build    # build geral
pnpm test     # testes
pnpm lint     # lint
```

## Executar apps separadamente

```bash
pnpm --filter @elo/admin dev  # http://localhost:3000
pnpm --filter @elo/pwa dev    # http://localhost:3001
pnpm --filter @elo/api dev    # http://localhost:3002
```

## Supabase

Aplicar migração inicial e seed:

```bash
# via Supabase CLI (quando configurado no ambiente)
supabase db reset
```

Após criar usuários no Supabase Auth, vincule-os em banco:

1. `member_profiles.auth_user_id` para cada membro.
2. `user_roles` com `admin` ou `member` por `user_id`.

## Estrutura

```text
apps/
  admin/
  pwa/
  api/
packages/
  core/
  ui/
  config/
docs/
  product/
  architecture/
  adr/
  backlog/
  governance/
  operations/
  testing/
  management/
supabase/
  migrations/
```

## Arquitetura

Ver documentação em:

- `docs/product/PRD.md`
- `docs/architecture/HLD-LLD-C4.md`
- `docs/architecture/API-CONTRACT.md`
- `docs/adr/`
- `docs/management/plan.md`
- `docs/operations/email-resend.md`
- `docs/operations/payments-manual-pix.md`
- `docs/governance/card-operations.md`
