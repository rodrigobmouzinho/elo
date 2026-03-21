# Arquitetura - HLD, LLD e C4

## HLD (High-Level Design)

```mermaid
flowchart LR
A[Admins Elo] --> B[Admin Web - Next.js]
C[Membros] --> D[PWA Mobile - Next.js]
B --> E[API/BFF - Next.js Route Handlers]
D --> E
E --> F[(Supabase Postgres)]
E --> G[Supabase Auth]
E --> H[Supabase Storage]
E --> I[Fila de aprovacao PIX Manual]
E --> J[Email Transacional]
E --> K[Observabilidade - Sentry/Vercel]
```

## LLD (Low-Level Design)

### Módulos
- `apps/admin`: UI administrativa, dashboards e CRUDs principais.
- `apps/pwa`: UI mobile-first para membros, com navegacao inferior.
- `apps/api`: contrato REST interno e regras de negocio.
- `packages/core`: tipos, schemas e contratos.
- `packages/ui`: design tokens e componentes visuais.

### Fluxos principais
1. Login: `pwa/admin -> api/auth/login -> Supabase Auth`.
2. Gestao membro: `admin -> api/admin/members -> Postgres`.
3. Eventos: `admin create -> app list -> confirmacao membro`.
4. Gamificacao: `admin lanca pontos -> ranking atualizado`.
5. Pagamento: `checkout -> qr pix dinamico -> aprovacao admin -> confirmacao de presenca`.

### Limites de domínio
- Dominio Membros/Financeiro
- Dominio Eventos
- Dominio Gamificacao
- Dominio Networking (elos, projetos)

## C4 - Context

```mermaid
flowchart TD
U1[Admin Elo] --> S[Elo Networking Platform]
U2[Membro Elo] --> S
S --> P[Operacao Financeira Admin]
S --> M[Servico de E-mail]
S --> O[Observabilidade]
```

## C4 - Container

```mermaid
flowchart LR
A[Admin App] --> API[API/BFF]
PWA[PWA App] --> API
API --> DB[(Supabase Postgres)]
API --> AUTH[Supabase Auth]
API --> ST[Supabase Storage]
API --> PAY[PIX Manual + Aprovacao Admin]
API --> MAIL[Resend]
API --> OBS[Sentry + Vercel Logs]
```

## C4 - Component (API)

```mermaid
flowchart TD
R[Route Handlers] --> V[Validacao Zod]
R --> U[Autorizacao por Role]
R --> S[Servicos de Dominio]
S --> REP[Repositorios]
REP --> DB[(Postgres)]
S --> PAY[Servico Pagamento]
S --> NOTI[Servico Notificacao]
```
