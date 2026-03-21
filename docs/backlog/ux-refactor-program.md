# Programa de Refatoracao Total da Interface

## Objetivo
- Reestruturar Admin e PWA para reduzir excesso de cards, texto editorial, comentarios visuais e acoplamento entre layout, copy e estado.
- Preservar regras de negocio, fluxos criticos e integracao atual, atuando na camada de experiencia, arquitetura visual e organizacao da interface.

## Principios de execucao
- Cada tela deve responder em ate 5 segundos: objetivo, dado principal e acao principal.
- Admin deve ser orientado a tarefa e decisao.
- PWA deve ser orientado a descoberta e acao.
- Nenhuma tela operacional deve abrir com mais de 1 hero e 2 blocos de suporte antes da area principal de trabalho.
- Cards que repetem dados de tabela, formulario ou KPI devem ser removidos.
- Microcopy deve ser objetiva, sem manifesto editorial e sem comentarios descritivos do proprio layout.

## Ordem de execucao recomendada
1. ELO-071 Auditoria total de UX/UI
2. ELO-072 Arquitetura de informacao da refatoracao
3. ELO-073 Sistema de conteudo e microcopy
4. ELO-074 Refatorar fundacao visual do design system
5. ELO-075 Refatorar primitives de layout e data display
6. ELO-076 Refatorar shells e navegacao global
7. ELO-077 Refatorar autenticacao e entrada do Admin
8. ELO-078 Refatorar dashboard executivo do Admin
9. ELO-079 Refatorar modulo Membros do Admin
10. ELO-080 Refatorar modulo Eventos do Admin
11. ELO-081 Refatorar modulo Financeiro do Admin
12. ELO-082 Refatorar modulo Gamificacao do Admin
13. ELO-083 Refatorar autenticacao e Home do PWA
14. ELO-084 Refatorar Diretorio e Elos do PWA
15. ELO-085 Refatorar Perfil e Projetos do PWA
16. ELO-086 Refatorar Gamificacao, Detalhe de Evento e Checkout do PWA
17. ELO-087 QA de refatoracao total e regressao visual

## Dependencias por card
| ID | Depende de | Saida obrigatoria |
|---|---|---|
| ELO-071 | - | Inventario de telas, componentes, copys, estados e problemas priorizados |
| ELO-072 | ELO-071 | Blueprint por tela com hierarquia, blocos e acao primaria |
| ELO-073 | ELO-071, ELO-072 | Matriz de microcopy para headers, feedbacks e empty states |
| ELO-074 | ELO-072 | Tokens, densidade, espacamento, elevacao, grid e responsividade revisados |
| ELO-075 | ELO-073, ELO-074 | Biblioteca base nova para headers, metricas, listas, cards, tabelas e formularios |
| ELO-076 | ELO-074, ELO-075 | Shells e navegacao global novos para admin e pwa |
| ELO-077 | ELO-073, ELO-075, ELO-076 | Entrada admin simplificada e consistente |
| ELO-078 | ELO-073, ELO-075, ELO-076 | Dashboard admin orientado a decisao |
| ELO-079 | ELO-073, ELO-075, ELO-076 | Modulo Membros admin padronizado |
| ELO-080 | ELO-073, ELO-075, ELO-076 | Modulo Eventos admin padronizado |
| ELO-081 | ELO-073, ELO-075, ELO-076 | Modulo Financeiro admin com fila critica e acoes claras |
| ELO-082 | ELO-073, ELO-075, ELO-076 | Modulo Gamificacao admin consistente |
| ELO-083 | ELO-073, ELO-075, ELO-076 | Entrada e home do PWA reorganizadas |
| ELO-084 | ELO-073, ELO-075, ELO-076 | Diretorio social orientado a conexao |
| ELO-085 | ELO-073, ELO-075, ELO-076 | Perfil e projetos com formularios e cards enxutos |
| ELO-086 | ELO-073, ELO-075, ELO-076 | Jornada critica do membro reestruturada |
| ELO-087 | ELO-077, ELO-078, ELO-079, ELO-080, ELO-081, ELO-082, ELO-083, ELO-084, ELO-085, ELO-086 | Staging pronto para validacao final |

## Criterios de aceite do programa
- Headers limitados a titulo e no maximo uma frase util.
- Tabelas, listas e formularios tornam-se a area principal nas telas operacionais.
- Estados de loading, erro, sucesso e vazio passam a seguir padrao unico.
- Admin e PWA deixam de compartilhar a mesma retorica visual, mantendo apenas a base do design system.
- Paginas deixam de concentrar centenas de linhas de layout inline sem decomposicao reutilizavel.
- Fluxos criticos do MVP continuam funcionando: login, reset, CRUD de membros, CRUD de eventos, PIX manual, aprovacao admin, ranking, elos e projetos.

## Riscos
- Big bang rewrite de muitas telas em paralelo.
- Troca visual sem reducao real de complexidade.
- Regressao em fluxos criticos por acoplamento entre UI e estado.

## Mitigacoes
- Executar por fundacao -> shells -> admin -> pwa -> QA.
- Validar cada card com lint, testes existentes e smoke manual do modulo.
- Tratar ELO-081 e ELO-086 como trilhas criticas por influencia direta em receita e experiencia do membro.
