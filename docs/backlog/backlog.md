# Backlog Priorizado (MoSCoW + WSJF)

## Legenda
- Prioridade: Must / Should / Could
- WSJF simplificado: maior valor = executar antes

| ID | User Story | Gherkin (resumo) | MoSCoW | WSJF | Estimativa |
|---|---|---|---|---:|---:|
| ELO-001 | Monorepo base | Given repo vazio, When setup concluido, Then admin/pwa/api sobem com scripts padrao | Must | 13 | 5 |
| ELO-002 | Design tokens Elo | Given telas principais, When aplicar tokens, Then UI segue branding oficial | Must | 11 | 3 |
| ELO-003 | Auth por role | Given credenciais validas, When login, Then permissao respeita role admin/member | Must | 12 | 5 |
| ELO-004 | CI/CD preview | Given PR aberta, When pipeline executar, Then build/test/lint/security rodam | Must | 11 | 5 |
| ELO-005 | Observabilidade baseline | Given erro em producao, When investigar, Then logs e traces identificam causa | Must | 10 | 3 |
| ELO-010 | CRUD membros | Given admin logado, When criar/editar membro, Then registro aparece no app | Must | 12 | 5 |
| ELO-011 | Validade anuidade | Given membro vencido, When data expirar, Then acesso fica inativo | Must | 12 | 5 |
| ELO-012 | Cobranca anuidade | Given cobranca emitida, When pagamento aprovado, Then status financeiro atualiza | Must | 12 | 5 |
| ELO-013 | Refatorar pagamentos para PIX manual | Given checkout de item pago, When QR dinamico e gerado e admin aprova, Then status vai para pago e vincula ao item adquirido | Must | 13 | 5 |
| ELO-014 | Dashboard financeiro | Given periodo filtrado, When consultar, Then mostra totais e inadimplencia | Should | 7 | 3 |
| ELO-020 | CRUD eventos | Given admin publica evento, When membro acessar, Then regras de acesso/preco corretas | Must | 11 | 5 |
| ELO-021 | Midia de eventos | Given upload de imagem, When abrir evento, Then imagem principal/galeria exibidas | Must | 8 | 3 |
| ELO-022 | Confirmar presenca | Given evento aberto, When membro confirmar, Then entra na lista de confirmados | Must | 11 | 5 |
| ELO-023 | Checkout evento pago | Given evento pago, When checkout aprovado, Then presenca confirmada | Must | 13 | 8 |
| ELO-024 | Evento online | Given evento online, When admin informar link, Then membro acessa via detalhe | Must | 8 | 2 |
| ELO-030 | Temporadas game | Given temporada ativa, When pontos lancados, Then ranking considera periodo correto | Must | 11 | 5 |
| ELO-031 | Lancamento de pontos | Given participacao validada, When admin lancar pontos, Then ranking atualiza | Must | 11 | 5 |
| ELO-032 | Badges automaticas | Given regra atingida, When job processar, Then badge e concedida | Should | 7 | 5 |
| ELO-033 | Ranking atual | Given temporada ativa, When abrir gamificacao, Then mostra posicao e pontuacao | Must | 10 | 3 |
| ELO-034 | Historico de temporadas | Given temporadas encerradas, When consultar, Then mostra campeao e classificacao | Should | 6 | 3 |
| ELO-040 | Reset senha e-mail | Given e-mail valido, When solicitar reset, Then recebe link seguro | Must | 10 | 3 |
| ELO-041 | Home de eventos no PWA | Given eventos publicados, When abrir home, Then cards exibem data/local/imagem | Must | 10 | 3 |
| ELO-042 | Diretorio de membros | Given membros ativos, When pesquisar nome, Then lista filtra corretamente | Must | 9 | 3 |
| ELO-043 | Elo entre membros | Given perfil de membro, When clicar em Elo, Then vinculo e salvo | Must | 10 | 5 |
| ELO-044 | Botao WhatsApp | Given telefone valido, When clicar icone, Then abre conversa com um toque | Should | 6 | 2 |
| ELO-045 | Edicao de perfil | Given dados permitidos, When salvar perfil, Then atualiza sem alterar e-mail/celular | Must | 10 | 5 |
| ELO-046 | Cadastro de projetos | Given formulario valido, When publicar, Then projeto fica visivel | Must | 10 | 5 |
| ELO-047 | Inscricao em projetos | Given projeto aberto, When membro se candidatar, Then dono recebe inscricao | Must | 9 | 5 |
| ELO-050 | Suite de testes | Given pipeline CI, When rodar testes, Then fluxos criticos passam | Must | 11 | 8 |
| ELO-051 | QA PWA performance | Given build staging, When Lighthouse rodar, Then metas minimas atendidas | Must | 8 | 3 |
| ELO-052 | Beta controlado | Given grupo beta Elo, When usar sistema, Then bugs criticos sao tratados | Must | 9 | 5 |
| ELO-053 | Rollback validado | Given incidente, When rollback acionado, Then restauracao ocorre em minutos | Must | 9 | 3 |
| ELO-054 | Revisao de textos pt-BR | Given interfaces e mensagens da plataforma, When revisar ortografia e acentuacao, Then textos ficam consistentes em pt-BR sem erros de acento | Should | 7 | 3 |
| ELO-055 | Fundar design system semantico | Given telas atuais, When tokens semanticos forem aplicados, Then toda UI usa contrato visual unico | Must | 13 | 5 |
| ELO-056 | Implantar tipografia oficial Kurino/Anek | Given app carregado, When fontes forem aplicadas, Then hierarquia tipografica segue brandbook | Must | 11 | 3 |
| ELO-057 | Criar primitives de formulario e feedback | Given formularios admin/pwa, When usar primitives, Then estados default/hover/focus/error/disabled ficam consistentes | Must | 12 | 5 |
| ELO-058 | Unificar shells de navegacao admin/pwa | Given navegacao atual, When shells forem refatorados, Then contexto e orientacao entre telas ficam consistentes | Must | 12 | 5 |
| ELO-059 | Refatorar login admin e feedback de auth | Given usuario admin, When autenticar/resetar senha, Then fluxo visual e mensagens seguem padrao UX novo | Must | 10 | 3 |
| ELO-060 | Refatorar dashboard admin | Given dashboard admin, When abrir visao geral, Then KPIs criticos ficam escaneaveis e acionaveis | Must | 10 | 3 |
| ELO-061 | Refatorar modulo Eventos admin | Given admin em eventos, When criar/editar/remover, Then formularios e listagens seguem padroes unicos | Must | 11 | 5 |
| ELO-062 | Refatorar modulo Membros admin | Given admin em membros, When operar CRUD, Then UX mantem consistencia de componentes e feedback | Must | 11 | 5 |
| ELO-063 | Refatorar modulo Financeiro admin | Given admin em financeiro, When aprovar/gerar cobranca/exportar, Then acoes criticas tem clareza e seguranca visual | Must | 13 | 8 |
| ELO-064 | Refatorar modulo Gamificacao admin | Given admin em gamificacao, When criar temporada/lancar pontos/processar badges, Then fluxo fica consistente com o sistema de UI | Should | 7 | 5 |
| ELO-065 | Refatorar login e home de eventos PWA | Given membro no app, When abrir login/home, Then identidade hibrida marca+Figma aparece com alta legibilidade | Must | 11 | 5 |
| ELO-066 | Refatorar detalhe de evento e checkout PIX | Given evento pago/gratuito, When confirmar presenca/pagar, Then jornada e clara, confiavel e sem friccao visual | Must | 13 | 8 |
| ELO-067 | Refatorar diretorio de membros e elo | Given membro no diretorio, When pesquisar/conectar, Then acoes principais ficam rapidas com feedback nitido | Must | 10 | 5 |
| ELO-068 | Refatorar perfil e projetos/ideias PWA | Given membro no perfil/projetos, When editar/candidatar, Then formularios e cards seguem nova linguagem | Must | 10 | 5 |
| ELO-069 | Refatorar gamificacao PWA | Given membro na gamificacao, When consultar ranking/historico, Then leitura e comparacao de desempenho ficam fluidas | Should | 6 | 3 |
| ELO-070 | QA final UX/UI e release/rollback | Given refatoracao concluida, When rodar gates, Then release entra com seguranca e rollback validado | Must | 12 | 8 |
| ELO-071 | Auditoria total de UX/UI | Given admin e pwa atuais, When inventariar telas, componentes, cards, copys e estados, Then backlog de refatoracao nasce com escopo objetivo e rastreavel | Must | 13 | 3 |
| ELO-072 | Arquitetura de informacao da refatoracao | Given inventario concluido, When definir hierarquia, foco primario e fluxo de cada tela, Then cada jornada passa a responder objetivo, dado principal e acao principal | Must | 12 | 3 |
| ELO-073 | Sistema de conteudo e microcopy | Given telas auditadas, When reescrever headers, descricoes, feedbacks e empty states, Then a interface perde texto editorial excessivo e ganha linguagem objetiva | Must | 12 | 3 |
| ELO-074 | Refatorar fundacao visual do design system | Given tokens e estilos base atuais, When revisar temas, espacamento, elevacao, densidade e responsividade, Then a plataforma ganha uma fundacao visual unica e sustentavel | Must | 13 | 5 |
| ELO-075 | Refatorar primitives de layout e data display | Given componentes compartilhados atuais, When reconstruir PageHeader, MetricStrip, PriorityStrip, FeedCard, DataTable e SidePanelForm, Then as paginas deixam de repetir estruturas infladas e acopladas | Must | 13 | 5 |
| ELO-076 | Refatorar shells e navegacao global | Given AdminShell e MemberShell atuais, When simplificar navegacao, chrome e orientacao de contexto, Then admin e pwa passam a ter identidade e ritmo proprios | Must | 12 | 5 |
| ELO-077 | Refatorar autenticacao e entrada do Admin | Given tela de login e acesso admin, When aplicar nova linguagem visual e de feedback, Then o fluxo de autenticacao fica claro, confiavel e consistente com o restante do sistema | Must | 9 | 3 |
| ELO-078 | Refatorar dashboard executivo do Admin | Given dashboard atual muito narrativo, When reorganizar KPIs, alertas e proximas acoes, Then a tela prioriza decisao rapida em vez de leitura editorial | Must | 11 | 5 |
| ELO-079 | Refatorar modulo Membros do Admin | Given CRUD e CRM atuais, When reestruturar lista, filtros, estados e painel lateral, Then a operacao de membros fica mais enxuta, previsivel e escalavel | Must | 11 | 5 |
| ELO-080 | Refatorar modulo Eventos do Admin | Given agenda e formulacao atuais, When simplificar triagem, CRUD, midia e acesso, Then o modulo responde rapidamente publicacao, edicao e leitura operacional | Must | 11 | 5 |
| ELO-081 | Refatorar modulo Financeiro do Admin | Given tela financeira densa e extensa, When reorganizar overview, filas e acoes criticas, Then cobranca, aprovacao e exportacao ficam mais seguras e claras | Must | 13 | 8 |
| ELO-082 | Refatorar modulo Gamificacao do Admin | Given operacao de temporadas e pontos, When simplificar ranking, temporadas e badges, Then o fluxo admin fica coeso com os demais modulos | Should | 8 | 5 |
| ELO-083 | Refatorar autenticacao e Home do PWA | Given login e home atuais, When reconstruir entrada, descoberta e feed principal, Then o membro entende imediatamente eventos, pessoas e proximos passos | Must | 12 | 5 |
| ELO-084 | Refatorar Diretorio e Elos do PWA | Given diretorio atual, When priorizar busca, contexto por pessoa e acoes primarias, Then criar conexoes passa a exigir menos leitura e menos cliques | Must | 10 | 5 |
| ELO-085 | Refatorar Perfil e Projetos do PWA | Given perfil e ideias atuais, When reestruturar formularios, cards e publicacao/candidatura, Then o membro opera posicionamento e colaboracao com muito menos ruido | Must | 10 | 5 |
| ELO-086 | Refatorar Gamificacao, Detalhe de Evento e Checkout do PWA | Given ranking e jornada de evento atuais, When clarificar comparacao, presenca e pagamento manual PIX, Then a experiencia critica do membro fica legivel e confiavel ponta a ponta | Must | 13 | 8 |
| ELO-087 | QA de refatoracao total e regressao visual | Given programa de refatoracao concluido, When executar a11y, responsividade, smoke tests, visual regression e performance, Then a nova interface pode seguir para staging com seguranca | Must | 13 | 5 |
| ELO-088 | Ciclo de vida de projetos | Given projeto ativo, When dono concluir ou excluir logicamente, Then a listagem e as candidaturas passam a respeitar status ativo/concluido/inativo com trilha de auditoria | Must | 11 | 5 |
| ELO-089 | Moderacao de candidaturas em projetos | Given membro interessado, When dono aprovar ou recusar com justificativa, Then a visibilidade dos candidatos respeita dono, aprovados e recusados sem exposicao indevida | Must | 13 | 8 |
| ELO-090 | Inbox de notificacoes de projetos | Given candidatura aprovada ou recusada, When decisao for registrada, Then o membro recebe notificacao interna no app com contexto suficiente para agir | Must | 10 | 5 |
| ELO-091 | Operacao de projetos no PWA | Given dono, aprovados e interessados no PWA, When abrir lista/detalhe/notificacoes, Then status, equipe, moderacao e bloqueios de candidatura ficam claros e seguros | Must | 12 | 8 |
| ELO-092 | Upload de galeria e documentacao em projetos | Given dono criando ou editando um projeto, When selecionar imagens e PDFs locais, Then o sistema faz upload real com limites, compressao de imagem e exibe os arquivos no detalhe sem depender de URLs manuais | Must | 12 | 8 |
| ELO-093 | Solicitação pública de adesão | Given visitante interessado, When preencher o formulário mobile-first de adesão, Then a solicitação é registrada com snapshot do perfil e feedback claro de envio | Must | 12 | 5 |
| ELO-094 | Workflow e status de adesão | Given admins acompanhando novas solicitações, When atualizar status intermediários e trilha histórica, Then o funil operacional fica rastreável com status finais reservados | Must | 13 | 8 |
| ELO-095 | Painel admin de adesões | Given administradores da Elo, When abrir o módulo de adesões, Then conseguem filtrar, anotar, aprovar, recusar e cadastrar novos status intermediários | Must | 13 | 8 |
| ELO-096 | Aprovação com provisionamento de acesso | Given solicitação aprovada, When o admin confirmar a validade inicial da associação, Then usuário auth, perfil, role, membership e senha temporária são provisionados automaticamente | Must | 13 | 8 |
| ELO-097 | Primeiro acesso com troca obrigatória de senha | Given membro aprovado com senha temporária, When fizer o primeiro login no PWA, Then cria uma senha forte definitiva antes de acessar a comunidade | Must | 12 | 5 |
