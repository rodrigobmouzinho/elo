# Operação por Cards

## Comandos
- Sincronizar cards com GitHub Issues + Project:
  - `./scripts/sync_github_project_cards.sh`
- Sincronizar apenas issues (quando GraphQL estiver limitado):
  - `SYNC_GITHUB_PROJECT=false ./scripts/sync_github_project_cards.sh`
- Marcar card concluído e puxar próximo da fila:
  - `./scripts/pull_next_card.sh ELO-013`
- Apenas descobrir próximo card:
  - `./scripts/pull_next_card.sh`

## Ciclo padrão
1. Executar sincronização do Project.
2. Colocar somente 1 card em `In Progress`.
3. Implementar escopo do card sem adicionar funcionalidades.
4. Rodar validações: `pnpm lint && pnpm test && pnpm build`.
5. Commitar na `main` com referência ao card.
6. Atualizar status do card para `Done`.
7. Puxar o próximo card da fila fixa.
