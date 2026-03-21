# AGENTS — Protocolo de Execução do Projeto

## Regra principal
- A execução do projeto é **100% orientada por CARDS**.
- Não propor, implementar ou alterar escopo fora do card ativo.
- Não criar funcionalidades novas sem card aprovado no GitHub Project.

## Fonte oficial de trabalho
- Fonte única: GitHub Project `Elo Networking - Delivery` (owner `rodrigobmouzinho`, #1).
- Todo trabalho deve estar mapeado em um card `ELO-xxx`.
- Ao iniciar, puxar o próximo card da fila fixa.
- Ao finalizar, atualizar o Project e puxar automaticamente o próximo card.

## Fila fixa de execução
- Done inicial: `ELO-001`, `ELO-002`, `ELO-003`, `ELO-004`, `ELO-005`, `ELO-010`, `ELO-020`, `ELO-023`.
- Ordem ativa:
  - `ELO-013` -> `ELO-012` -> `ELO-011` -> `ELO-014` -> `ELO-021` -> `ELO-024` -> `ELO-022` -> `ELO-030` -> `ELO-031` -> `ELO-032` -> `ELO-033` -> `ELO-034` -> `ELO-040` -> `ELO-041` -> `ELO-042` -> `ELO-043` -> `ELO-044` -> `ELO-045` -> `ELO-046` -> `ELO-047` -> `ELO-050` -> `ELO-051` -> `ELO-052` -> `ELO-053` -> `ELO-054` -> `ELO-055` -> `ELO-056` -> `ELO-057` -> `ELO-058` -> `ELO-059` -> `ELO-060` -> `ELO-061` -> `ELO-062` -> `ELO-063` -> `ELO-064` -> `ELO-065` -> `ELO-066` -> `ELO-067` -> `ELO-068` -> `ELO-069` -> `ELO-070`.

## Fluxo obrigatório por card
1. Sincronizar backlog/campos no GitHub Project (`./scripts/sync_github_project_cards.sh`).
2. Mover somente 1 card para `In Progress`.
3. Implementar apenas o que está no card.
4. Validar localmente com `pnpm lint && pnpm test && pnpm build`.
5. Commit na `main` com mensagem semântica contendo o card (`feat: ... (ELO-013)`).
6. Push na `main`.
7. Mover card para `Done` no GitHub Project.
8. Selecionar o próximo card da fila (`./scripts/pull_next_card.sh ELO-xxx`).

## Governança técnica
- Stack de deploy: **Vercel**.
- Pagamentos: **manual_pix only** (sem ASAAS).
- Aprovação financeira: admin aprova pendências em `membership_payments` e `event_payments`.
- Manter documentação viva (`docs/*`) alinhada ao card concluído.

## Restrições operacionais
- Sem “alucinações”, sem improviso de roadmap, sem trocas de direção fora do plano.
- Evitar overengineering; foco em entrega, simplicidade e valor de negócio.
- Se houver bloqueio, registrar no card e manter rastreabilidade no Project.

## Fechamento de escopo
- Ao finalizar as funcionalidades planejadas, preparar **tag de release na `main`** e deploy em produção via Vercel.
