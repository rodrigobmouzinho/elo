# API Contract (MVP v1)

Base URL local: `http://localhost:3002`

## Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/reset-password`

## Admin (JWT com role `admin`)
- `GET /api/admin/members`
- `POST /api/admin/members`
- `GET /api/admin/events`
- `POST /api/admin/events`
- `GET /api/admin/gamification/seasons`
- `POST /api/admin/gamification/seasons`
- `POST /api/admin/gamification/seasons/:id/activate`
- `POST /api/admin/gamification/badges/process`
- `POST /api/admin/gamification/points`
- `GET /api/admin/finance/overview` (suporta `?period=7d|30d|90d|365d|all` ou `?startAt&endAt`)
- `GET /api/admin/finance/export` (CSV, suporta o mesmo filtro de periodo)
- `GET /api/admin/finance/memberships`
- `POST /api/admin/finance/memberships/:id/charge`
- `POST /api/admin/finance/memberships/:id/approve-payment`
- `GET /api/admin/finance/event-payments`
- `POST /api/admin/finance/event-payments/:id/approve`

## App (JWT com role `member`)
- `GET /api/app/events`
- `POST /api/app/events/:id/confirm`
- `POST /api/app/events/:id/checkout`
- `GET /api/app/events/:id/checkout-status`
- `GET /api/app/members`
- `POST /api/app/members/:id/elo`
- `GET /api/app/profile`
- `PATCH /api/app/profile`
- `GET /api/app/gamification/ranking`
- `GET /api/app/projects`
- `POST /api/app/projects`
- `PATCH /api/app/projects/:id`
- `POST /api/app/projects/:id/apply`

## Health
- `GET /api/health`

## Observacoes
- Autenticacao valida `Bearer token` via Supabase (`auth.getUser`) e role (`app_metadata` ou tabela `user_roles`).
- Sem Supabase configurado, o fallback de auth mock so funciona com `ALLOW_MOCK_AUTH=true`.
- `POST /api/auth/reset-password` normaliza `redirectTo` para HTTPS fora de localhost e retorna mensagem generica por seguranca.
- `GET /api/app/events` alimenta a Home do PWA com cards contendo `startsAt`, `location` e `heroImageUrl`.
- `GET /api/app/members` suporta `?search=` para filtrar diretorio de membros ativos por nome.
- `POST /api/app/members/:id/elo` cria vinculo de elo de forma idempotente e bloqueia auto-elo.
- `GET /api/app/profile` e `GET /api/app/members` retornam `whatsapp` para abrir conversa com um toque no PWA.
- `PATCH /api/app/profile` atualiza somente dados permitidos do perfil; `email` e `phone` permanecem inalterados.
- `POST /api/app/projects` publica projeto/ideia valida e o item fica disponivel na listagem `GET /api/app/projects`.
- `PATCH /api/app/projects/:id` permite atualizacao somente pelo dono do projeto.
- `POST /api/app/projects/:id/apply` registra candidatura idempotente e vincula a inscricao ao dono do projeto.
- Projetos agora expõem `summary`, `businessAreas`, `vision`, `needs[]` e `galleryImageUrls[]`, preservando `category`, `description` e `lookingFor` como compatibilidade legada.
- Fluxo de pagamentos opera exclusivamente em `PAYMENTS_MODE=manual_pix`.
- Checkout pago retorna `manualPayment` com `pixQrCodeImage` e `pixCopyPaste` para UX de pagamento.
- CRUD de eventos suporta `onlineUrl`, `heroImageUrl` e `galleryImageUrls` (array de ate 8 imagens).
- `POST /api/app/events/:id/confirm` confirma presenca apenas para membros ativos em evento sem cobranca direta.
- Temporadas de gamificacao podem ser criadas/inativadas no admin; o ranking usa sempre a temporada `active=true`.
- `GET /api/app/gamification/ranking` retorna entradas com `rank` e `points` para exibicao de posicao/pontuacao no app.
- `GET /api/app/gamification/ranking` tambem retorna `champions` com historico de temporadas encerradas (campeao + classificacao).
- `POST /api/admin/gamification/points` exige `eventId` com participacao confirmada (`event_registrations.status=confirmed`).
- `POST /api/admin/gamification/badges/process` executa o job de concessao automatica de badges por regra de ranking da temporada ativa.
