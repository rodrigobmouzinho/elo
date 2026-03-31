# Setup Vercel

## Projetos sugeridos
- `elo-admin` -> raiz `apps/admin`
- `elo-pwa` -> raiz `apps/pwa`
- `elo-api` -> raiz `apps/api`

## Variaveis de ambiente minimas
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
1. PR abre deploy preview automatico
2. Merge em `main` habilita deploy de producao conforme regras do projeto
3. Tag de release para rastreabilidade

## Acompanhamento da refatoracao do PWA
- O `apps/pwa` usa `@vercel/toolbar` para habilitar a Toolbar no localhost durante a refatoracao.
- Em preview deployments da Vercel, comentarios e share link continuam sendo a superficie principal de revisao.
- No localhost, a Toolbar aparece apenas em `NODE_ENV=development`, evitando impacto no build publicado.

## Acompanhamento da refatoracao do Admin
- O `apps/admin` usa `@vercel/toolbar` no mesmo formato do PWA para habilitar a Toolbar no localhost durante a refatoracao do backoffice.
- Em preview deployments da Vercel, comentarios e share link continuam sendo a superficie principal de revisao das telas administrativas.
- No localhost, a Toolbar aparece apenas em `NODE_ENV=development`, sem impacto no bundle publicado.

## Setup minimo para revisar o PWA em tempo real
1. Criar o projeto `elo-pwa` na Vercel apontando para a raiz `apps/pwa`.
2. Conectar o repositorio `rodrigobmouzinho/elo`.
3. Rodar `vercel link apps/pwa` no ambiente local para vincular o diretorio ao projeto da Vercel.
4. Subir o PWA localmente e abrir a Toolbar para comentar, compartilhar preview e acompanhar a refatoracao tela a tela.
5. Usar o preview deployment da PR ou da `main` como base de validacao visual antes de cada merge.

## Setup minimo para revisar o Admin em tempo real
1. Criar o projeto `elo-admin` na Vercel apontando para a raiz `apps/admin`.
2. Conectar o repositorio `rodrigobmouzinho/elo`.
3. Rodar `vercel link apps/admin` no ambiente local para vincular o diretorio ao projeto da Vercel.
4. Subir o admin localmente e usar a Toolbar para revisar refinamentos visuais e fluxos administrativos.
5. Validar cada tela do admin no preview deployment antes de consolidar o redesign.

## Fluxo recomendado para a refatoracao UX/UI
1. Refatorar uma tela do PWA por vez com base no Stitch.
2. Validar localmente com a Toolbar ativa para revisar detalhes visuais e comportamento.
3. Publicar a alteracao no preview deployment da Vercel.
4. Registrar comentarios direto na interface do preview quando precisar marcar ajustes finos de layout, spacing, copy ou interacao.
