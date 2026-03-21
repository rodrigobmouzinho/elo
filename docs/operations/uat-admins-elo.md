# UAT com Admins Elo (Beta)

## Objetivo
Executar o beta controlado com admins Elo e garantir tratamento imediato de bugs criticos.

## Escopo minimo do UAT
- Login admin e member
- Financeiro admin: pendencias, aprovacao manual e export CSV
- Eventos: CRUD admin, checkout member e confirmacao de presenca
- Networking: diretorio, criacao de elo, perfil e projetos

## Registro de bugs no beta
- Abrir issue com template `UAT Critical Bug`.
- Labels obrigatorias para criticidade:
  - `bug`
  - `severity:critical`
  - `phase:uat`

## Regra de tratamento de criticos
- Nao avancar para fechamento de beta com bug critico aberto.
- Todo bug critico deve ter:
  - causa raiz registrada
  - plano de correcao
  - validacao de reteste

## Gate oficial do card
```bash
pnpm qa:uat-gate
```

## Resultado esperado para aprovar gate
- `Gate aprovado: nenhum bug critico de UAT aberto.`
