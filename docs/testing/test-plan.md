# Plano de Testes

## Unit
- Validacao de schemas em `@elo/core`
- Funcoes utilitarias de API

## Integration
- Endpoints REST principais com sucesso e erro
- Login e reset de senha por e-mail com link seguro (Resend + fallback Supabase)
- Home de eventos do PWA conectada ao endpoint de eventos (cards com data/local/imagem)
- Diretorio de membros no PWA com busca por nome e filtro apenas de membros ativos
- Criacao de elo entre membros com persistencia e idempotencia
- Clique no icone de WhatsApp no perfil com telefone valido
- Edicao de perfil com restricao de alteracao para email/celular
- Cadastro de projeto/ideia com formulario valido e visibilidade imediata na listagem
- Candidatura em projeto aberto com entrega da inscricao ao dono do projeto
- Checkout de eventos e anuidades com `manual_pix`
- Aprovacao admin de pagamentos pendentes e reflexo de status
- Controle de validade da anuidade (expiracao inativa acesso + renovacao reativa membro)
- Dashboard financeiro com filtro por periodo e exportacao CSV
- Upload de imagem principal e galeria de eventos no CRUD admin e exibicao no app
- Evento online com link de acesso informado no admin e exibido no app
- Confirmacao de presenca pelo membro em evento aberto (com idempotencia e bloqueio para membro inativo)
- Criacao e ativacao de temporadas de gamificacao com ranking filtrado pela temporada ativa
- Lancamento de pontos por admin apenas com participacao validada (evento confirmado)
- Job de concessao automatica de badges por regras de ranking (com idempotencia)
- Ranking da temporada no app com exibicao de posicao e pontuacao do membro autenticado
- Historico de temporadas encerradas no app com campeao e classificacao

## E2E
- Fluxo critico financeiro ponta a ponta: login member/admin -> checkout manual PIX -> aprovacao admin -> checkout-status `paid`
- Fluxo critico de networking: busca de membros -> criacao de elo -> publicacao de projeto -> candidatura em projeto aberto
- Pipeline executa a suite completa com `pnpm test` (unit + integration + e2e)

## Performance QA (PWA)
- Auditoria Lighthouse no staging via `pnpm qa:pwa-performance`
- Budget minimo:
  - `performance score >= 0.75`
  - `LCP <= 3000ms`
  - `CLS <= 0.1`
  - `TBT <= 300ms`

## Accessibility QA (PWA)
- Auditoria Lighthouse de acessibilidade via `pnpm qa:pwa-a11y`
- Budget minimo:
  - `accessibility score >= 0.9`
  - auditorias criticas obrigatorias (ex: `button-name`, `image-alt`, `label`, `link-name`, `color-contrast`)

## Visual Regression QA (PWA)
- Captura e comparacao de screenshots via `pnpm qa:visual-regression`
- Rotas padrao:
  - `/login`
  - `/`
  - `/membros`
  - `/perfil`
  - `/projetos`
  - `/gamificacao`
- Baseline em `docs/qa/visual-baseline/pwa`
- Evidencias em `reports/visual-current/pwa` e `reports/visual-diff/pwa`

## UAT Beta (Admins Elo)
- Sessao beta guiada com admins usando o roteiro `docs/operations/uat-admins-elo.md`
- Todo bug critico abre issue com labels `bug` + `severity:critical` + `phase:uat`
- Gate de aprovacao do beta: `pnpm qa:uat-gate` deve retornar sem criticos abertos

## Release/Rollback QA
- Simulacao de incidente com acionamento do playbook `docs/operations/release-rollback.md`
- Gate de recuperacao: `pnpm qa:rollback-gate`
- Aprovacao quando restauracao ocorre em ate 5 minutos
- Gate final consolidado para release UX/UI: `pnpm qa:ux-final-gate`

## Carga leve (M4)
- 100 req/min na listagem de eventos
- 50 req/min no ranking

## Criterios de aceite
- Cobertura funcional dos fluxos criticos sem erro bloqueante
- Regressao zero em auth e pagamentos manuais PIX
