# ELO-071 - Auditoria total de UX/UI

## Objetivo
- Inventariar as telas, componentes compartilhados, copys e estados atuais do Admin e do PWA.
- Registrar os problemas que explicam o excesso de cards, texto editorial e comentarios visuais.
- Entregar uma base objetiva para ELO-072 (arquitetura de informacao) e ELO-073 (microcopy).

## Escopo auditado
- Admin: `apps/admin/app/login`, `apps/admin/app/page`, `apps/admin/app/members`, `apps/admin/app/events`, `apps/admin/app/financeiro`, `apps/admin/app/gamification`
- PWA: `apps/pwa/app/login`, `apps/pwa/app/page`, `apps/pwa/app/membros`, `apps/pwa/app/perfil`, `apps/pwa/app/projetos`, `apps/pwa/app/gamificacao`, `apps/pwa/app/eventos/[id]`
- Fundacao compartilhada: `packages/ui/src/components/data-display.tsx`, `packages/ui/src/components/navigation-shell.tsx`, `packages/ui/src/components/card.tsx`, `apps/admin/components/admin-shell.tsx`, `apps/pwa/components/member-shell.tsx`

## Metodo
- Leitura estatica das telas e dos componentes compartilhados.
- Contagem de linhas por arquivo para localizar densidade estrutural.
- Inventario de `Card`, `FeedCard`, `PageHeader`, `Badge`, `Alert`, `EmptyState`, `DataTable` e `SidePanelForm`.
- Leitura de titulos, subtitulos, estados de loading/empty e copys que descrevem a propria interface.

## Resumo executivo
- A superficie atual tem 13 telas principais de interface.
- 8 das 13 telas passam de 500 linhas e concentram layout, copy, estado e regra de apresentacao no mesmo arquivo.
- O design system compartilhado tem dois gargalos centrais:
  - `data-display.tsx`: 653 linhas e 58 usos de `style={{ ... }}`
  - `navigation-shell.tsx`: 600 linhas e 68 usos de `style={{ ... }}`
- A interface usa no minimo 36 blocos tipo card (`Card` + `FeedCard`) e 154 badges nas telas auditadas.
- Existem 28 instancias de `Alert` e 16 instancias de `EmptyState`, quase sempre com linguagem customizada por tela.
- O problema principal nao e falta de componente. O problema e componente compartilhado permissivo demais, pagina grande demais e copy tentando explicar a propria composicao visual.

## Achados globais

### 1. Excesso de camadas antes da area principal
- O Admin usa muitos blocos de suporte antes da tabela ou fila principal.
- O PWA frequentemente abre com hero + card editorial + card de apoio + feed, o que compete com a acao primaria.
- A regra do programa ("1 hero e no maximo 2 blocos de suporte") nao e respeitada nas jornadas principais.

### 2. Copy editorial descrevendo o layout
- Varias telas falam da propria interface em vez de falar do trabalho ou da decisao.
- Padrao recorrente:
  - "agora funciona como..."
  - "foi redesenhado para..."
  - "a leitura principal e..."
  - "o diretorio agora funciona..."
- Isso cria leitura longa, pouco escaneavel e pouco util para retorno frequente do usuario.

### 3. Estados sem linguagem unificada
- Loading varia entre termos como "Montando sua home", "Atualizando financeiro", "Carregando projetos" e "Atualizando base de membros".
- Empty states alternam entre acao objetiva e texto de ambientacao.
- Feedbacks de erro/sucesso sao em geral claros, mas convivem com estados de apoio mais teatrais do que operacionais.

### 4. Fundacao visual e estrutural acoplada
- `PageHeader`, `MetricStrip`, `PriorityStrip`, `FeedCard` e `EmptyState` trazem tratamento visual muito opinativo junto com a estrutura.
- `AdminWorkspaceShell` e `MemberAppShell` carregam chrome, copy de contexto e comportamento em um mesmo arquivo grande.
- O sistema atual incentiva cada tela a empilhar secao explicativa, badges e subtitulos em vez de reduzir a hierarquia.

### 5. Admin e PWA compartilham a mesma retorica visual
- Apesar dos fluxos serem diferentes, os dois lados usam os mesmos sinais: badge de abertura, titulo grande, subtitulo explicativo, cards de apoio e blocos com copy interpretativa.
- O Admin deveria favorecer triagem e decisao.
- O PWA deveria favorecer descoberta e acao.
- Hoje os dois produtos parecem variacoes do mesmo template.

## Inventario por tela

### Admin
| Rota | Arquivo | Linhas | Estrutura atual | Achados principais | Prioridade |
|---|---|---:|---|---|---|
| `/login` | `apps/admin/app/login/page.tsx` | 247 | painel institucional + formulario + alert | A tela de acesso atua como landing page. O bloco institucional vende o redesign, mostra 3 vantagens e concorre com o formulario. O login deveria ser mais curto e confiavel. | Media |
| `/` | `apps/admin/app/page.tsx` | 720 | `PageHeader` + `PriorityStrip` + `MetricStrip` + 4 `Card` + `DataTable` + `Alert` + `EmptyState` | A tela mistura hero executivo, leituras de apoio, atalhos e tabela. A acao primaria nao fica isolada. O dashboard precisa decidir se e painel de decisao ou mesa de leitura. | Alta |
| `/members` | `apps/admin/app/members/page.tsx` | 813 | `PageHeader` + `PriorityStrip` + `MetricStrip` + `Card` + `DataTable` + `SidePanelForm` | Esta e uma das telas mais proximas do alvo, porque lista e painel lateral ja existem. Mesmo assim, o topo ainda usa texto descritivo demais e um radar adicional que pode ser absorvido pela propria lista. | Alta |
| `/events` | `apps/admin/app/events/page.tsx` | 727 | `PageHeader` + filtros + `MetricStrip` + `DataTable` + `SidePanelForm` | Melhor composicao operacional do Admin. O excesso aqui esta menos em cards e mais em badges, preview, instrucoes e sinais visuais espalhados. E uma boa candidata para virar padrao. | Media |
| `/financeiro` | `apps/admin/app/financeiro/page.tsx` | 1027 | `PageHeader` + `PriorityStrip` + `MetricStrip` + 5 `Card` + 2 `DataTable` + 2 `EmptyState` | E a tela de maior risco. Receita, aprovacao, exportacao e contexto ficam distribuidos em muitos blocos. Ha leitura demais antes da fila critica. O modulo precisa de hierarquia muito mais agressiva. | Critica |
| `/gamification` | `apps/admin/app/gamification/page.tsx` | 662 | `PageHeader` + `PriorityStrip` + `MetricStrip` + 2 `DataTable` + 2 `SidePanelForm` + 2 `Card` | Temporada, ranking, lancamento de pontos e badges ficam em uma tela coerente de negocio, mas a interface ainda gasta espaco com recomendacao, automacao e explicacao. | Alta |

### PWA
| Rota | Arquivo | Linhas | Estrutura atual | Achados principais | Prioridade |
|---|---|---:|---|---|---|
| `/login` | `apps/pwa/app/login/page.tsx` | 234 | hero institucional + 2 `FeedCard` + formulario + alert + lista de beneficios | O retorno do membro deveria entrar rapido. Hoje a tela apresenta proposta de produto antes da autenticacao, como uma landing page. | Media |
| `/` | `apps/pwa/app/page.tsx` | 584 | hero social + destaque de evento + radar do dia + blocos de pessoas/eventos/ranking + 4 `FeedCard` + 3 `EmptyState` | A home tenta fazer descoberta, agenda, diretorio e ranking ao mesmo tempo. A narrativa e forte, mas a acao principal muda de lugar ao longo da rolagem. | Alta |
| `/membros` | `apps/pwa/app/membros/page.tsx` | 470 | `PageHeader` + `Card` de apoio + lista social + alerts + empty states | O diretorio tem boa direcao, mas ainda abre com explicacao antes de mergulhar na lista. O card "Primeiros para abordar" pode virar faixa leve ou desaparecer. | Media |
| `/perfil` | `apps/pwa/app/perfil/page.tsx` | 485 | `PageHeader` + preview social + 4 `Card` + formulario | O perfil divide atencao entre leitura publica, assinatura, contato e edicao. O usuario deveria ter uma visao publica e uma superficie unica de edicao, nao quatro blocos equivalentes. | Alta |
| `/projetos` | `apps/pwa/app/projetos/page.tsx` | 530 | `PageHeader` + card de destaque + feed de oportunidades + formulario + card de dicas | Descoberta e publicacao aparecem juntas, mas sem hierarquia clara. O card de oportunidade em destaque e o card de dicas ampliam a rolagem e diluem a tarefa principal. | Alta |
| `/gamificacao` | `apps/pwa/app/gamificacao/page.tsx` | 491 | hero proprio + 3 `Card` + 1 `FeedCard` + 2 `EmptyState` | Podio, leitura pessoal, dicas de subida e historico aparecem com pesos parecidos. O ranking deveria dominar a tela; hoje ele divide foco com textos de enquadramento. | Media |
| `/eventos/[id]` | `apps/pwa/app/eventos/[id]/page.tsx` | 714 | hero do evento + 5 `Card` + 4 `Alert` + bloco PIX | E a jornada critica do membro e esta excessivamente fragmentada. "Sobre", "status", "confianca", "linha do status" e "pagamento" distribuem uma decisao que deveria caber em bem menos passos. | Critica |

## Inventario da fundacao compartilhada

| Componente | Arquivo | Linhas | Problema encontrado | Prioridade |
|---|---|---:|---|---|
| `PageHeader`, `MetricStrip`, `PriorityStrip`, `DataTable`, `FeedCard`, `EmptyState`, `SidePanelForm` | `packages/ui/src/components/data-display.tsx` | 653 | Muitos componentes com responsabilidade visual e estrutural no mesmo arquivo. `PageHeader`, `PriorityStrip` e `FeedCard` ja assumem subtitulo, descricao e forte tratamento visual, o que incentiva copy longa e composicao inflada. | Critica |
| `AdminWorkspaceShell`, `MemberAppShell` | `packages/ui/src/components/navigation-shell.tsx` | 600 | Shells gigantes, com copy embutida, chrome pesado e muito estilo inline. O arquivo mistura layout, navegacao, status e identidade visual dos dois produtos. | Critica |
| `Card` | `packages/ui/src/components/card.tsx` | 73 | O componente e simples, mas a API atual favorece `title` + `subtitle` em quase todo bloco, o que ajuda a multiplicar textos de enquadramento. | Alta |
| `AdminShell` | `apps/admin/components/admin-shell.tsx` | 77 | Wrapper enxuto, mas ainda duplica markup de navegacao e depende de um shell base muito opinativo. | Media |
| `MemberShell` | `apps/pwa/components/member-shell.tsx` | 97 | Wrapper enxuto, mas segue a mesma logica do Admin e carrega visual que aproxima demais o PWA do painel. | Media |

## Inventario de estados e copy

### Loading e busy states observados
- Admin:
  - "Montando a mesa do turno"
  - "Atualizando base de membros"
  - "Atualizando programacao"
  - "Atualizando financeiro"
  - "Atualizando gamificacao"
- PWA:
  - "Montando sua home"
  - "Carregando projetos"
  - "Carregando perfil"
  - "Atualizando diretorio"
  - "Atualizando corrida da temporada"
  - "Carregando evento"

### Empty states observados
- Admin:
  - "Sem dados operacionais"
  - "Nenhum membro encontrado"
  - "Nenhuma temporada cadastrada"
  - "Ranking ainda vazio"
  - "Nenhuma anuidade no recorte atual"
  - "Nenhuma pendencia de evento"
  - "Nenhum evento encontrado"
- PWA:
  - "Sem oportunidade em destaque"
  - "Nenhuma oportunidade encontrada"
  - "Sem sugestoes de membros no momento"
  - "Nenhum evento publicado"
  - "Ranking em preparacao"
  - "Sem sugestoes imediatas"
  - "Nenhum membro encontrado"
  - "Temporada pronta para comecar"
  - "Sem temporadas encerradas"

### Padroes de copy a retirar na refatoracao
- Texto que explica a propria interface:
  - "agora funciona como"
  - "foi redesenhado para"
  - "a leitura principal e"
  - "na mesma narrativa visual"
- Texto manifesto antes da tarefa:
  - login admin e login pwa
  - home do pwa
  - dashboard admin
- Cards de interpretacao que repetem o dado ja mostrado em KPI, tabela ou fila.

## Problemas priorizados

### P0 - Corrigir na fundacao antes das telas
1. Quebrar `data-display.tsx` em primitives menores por papel: header, metricas, lista, estado vazio, painel lateral, destaque.
2. Reduzir `navigation-shell.tsx` para shells mais leves, sem copy de contexto embutida.
3. Definir um numero maximo de blocos de suporte por tela antes da area principal.

### P1 - Tarefas criticas de negocio e experiencia
1. Redesenhar a hierarquia do `financeiro` admin.
2. Redesenhar a jornada de `eventos/[id]` no PWA.
3. Reduzir o topo narrativo do dashboard admin e da home do PWA.
4. Unificar linguagem de loading, empty, sucesso e erro.

### P2 - Tarefas de simplificacao por modulo
1. Consolidar preview + formulario no perfil do PWA.
2. Consolidar destaque + feed + publicacao em projetos.
3. Remover cards de interpretacao secundaria de membros e gamificacao.
4. Reduzir badges para o minimo de sinalizacao util.

## Oportunidades ja identificadas
- `apps/admin/app/events/page.tsx` e a melhor base para padrao operacional: filtro -> tabela -> painel lateral.
- `apps/admin/app/members/page.tsx` ja aponta para a direcao certa de lista + side panel, mas precisa menos contexto textual.
- O PWA tem bons elementos de descoberta, mas eles precisam ser reordenados para que o CTA principal apareca antes da narrativa.

## Saida obrigatoria para os proximos cards

### Insumos para ELO-072
- Definir por tela:
  - objetivo
  - dado principal
  - acao principal
  - blocos secundarios permitidos
- Decidir qual tela tera hero de contexto e qual tela sera puramente operacional.

### Insumos para ELO-073
- Definir um sistema de microcopy por tipo:
  - header
  - helper curto
  - loading
  - empty
  - sucesso
  - erro
  - CTA
- Eliminar frases que expliquem o layout ou o redesign.

## Conclusao
- A refatoracao total se justifica por evidencias estruturais, nao por preferencia visual.
- O excesso de cards e texto vem de tres fontes combinadas: componentes-base opinativos, paginas grandes demais e copy editorial sem regra.
- O caminho correto e: fundacao compartilhada -> arquitetura por tela -> microcopy -> refatoracao modulo a modulo.
