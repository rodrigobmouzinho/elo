# Governanca Tecnica

## Branching
- Desenvolvimento direto na `main`.
- Um commit por card finalizado.
- Commits semanticos: Conventional Commits + identificador do card (`ELO-xxx`).

## Pull Requests
- PR opcional para auditoria externa ou mudancas de alto risco.
- Fluxo padrao do projeto: `main` + commit/push por card + atualizacao do GitHub Project.

## Definicoes
- DoR: card com criterio de aceite, dependencia e owner.
- DoD: codigo, teste, docs e monitoria atualizados.

## Seguranca
- Segredos apenas em Vercel/Supabase secrets.
- Revisao de auth e autorizacao por PR.
- Rate limiting e validacao server-side obrigatorios.
