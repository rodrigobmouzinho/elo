# Setup Vercel

## Projetos sugeridos
- `elo-admin` -> raiz `apps/admin`
- `elo-pwa` -> raiz `apps/pwa`
- `elo-api` -> raiz `apps/api`

## Variáveis de ambiente mínimas
- `NEXT_PUBLIC_API_URL` (nos projetos `elo-admin` e `elo-pwa`, apontando para a raiz do `elo-api`, sem sufixo `/api`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PASSWORD_RESET_REDIRECT_URL`
- `PAYMENTS_MODE=manual_pix`
- `MANUAL_PIX_KEY`
- `MANUAL_PIX_KEY_TYPE`
- `MANUAL_PIX_BENEFICIARY`
- `MANUAL_PIX_CITY`
- `MANUAL_PAYMENT_PROOF_CONTACT`
- `MANUAL_PIX_INSTRUCTIONS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SENTRY_DSN`

## Pendencia antes do primeiro deploy
- Definir credenciais reais do Supabase para staging/producao no momento em que decidirmos subir os projetos: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`

## Fluxo de deploy
1. PR abre deploy preview automático
2. Merge em `main` habilita deploy de produção conforme regras do projeto
3. Tag de release para rastreabilidade
