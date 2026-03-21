# TODO Prioritario (Sprint atual)

## Done
- [x] ELO-001 Estrutura monorepo
- [x] ELO-002 Design system e tokens Elo
- [x] ELO-003 Auth real por JWT/RBAC (Supabase)
- [x] ELO-004 Workflow CI inicial
- [x] ELO-005 Observabilidade baseline (estrutura de logs e documentação de operação)
- [x] ELO-010 CRUD membros com persistencia Supabase
- [x] ELO-020 CRUD eventos com media upload
- [x] ELO-023 Validar operacao ponta a ponta do fluxo `manual_pix` em staging (checkout -> comprovante -> aprovacao admin -> checkout-status)
- [x] ELO-054 Revisao de textos pt-BR com acentuacao consistente em PWA/Admin/API
- [x] Passo 2: Frontends conectados aos endpoints reais da API
- [x] Passo 3: Checkout manual PIX + reconciliação por aprovação admin
- [x] Passo 1: Script de bootstrap para vincular `auth.users` e atribuir roles iniciais (`supabase/bootstrap_auth_roles.sql`)
- [x] Passo 2: Testes de integração da API para login, checkout e aprovação manual (Vitest)
- [x] Passo 3: Preview deploy de `admin` e `api` na Vercel (com claim URLs)
- [x] Passo 4: UX de checkout com feedback em tempo real (`/api/app/events/:id/checkout-status` + polling no PWA)
- [x] Passo 5: Proteção contra cobrança duplicada no checkout (reuso de pagamento pendente)
- [x] Passo 6: Reset de senha com provedor Resend (com fallback para Supabase Auth)
- [x] Passo 7: Link do projeto Supabase de staging e aplicação de migrations remotas (`supabase db push`)
- [x] Passo 8: Seed remoto executado em staging (`supabase/seed.sql`)
- [x] Passo 9: Bootstrap Auth/RBAC executado com auditoria de vínculo em staging
- [x] Passo 10: Fallback de pagamentos `manual_pix` implementado (checkout manual + aprovação admin)

## Doing
- [ ] ELO-013 Refatorar pagamentos para `manual_pix` only (remover ASAAS, webhook e habilitar QR dinâmico)
- [ ] Configurar `RESEND_API_KEY` + `EMAIL_FROM` (domínio validado) em staging/producao
- [ ] Rodar smoke test do reset de senha com Resend (staging)

## Next
- [ ] Publicar deploy de staging para `elo-pwa` na Vercel
- [ ] Configurar credenciais reais do Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) quando decidirmos subir staging/producao
- [ ] ELO-030 Temporadas de gamificacao
- [ ] ELO-041 Home de eventos no PWA conectada na API

## Blocked
- [ ] Validar dominio de envio no Resend (SPF/DKIM/DMARC) para liberar e-mail transacional em producao
