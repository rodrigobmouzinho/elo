# Revisoes do Admin Panel - Elo Networking

## Resumo Atual

Este documento consolida os ajustes recentes de design e usabilidade aplicados no Admin. Ele complementa o `docs/admin-design.md` com um foco mais pratico: o que ja foi corrigido, o que virou padrao e o que deve ser repetido nas proximas telas.

Status atual:

- `Membros`: revisado
- `Adesoes`: revisado
- `Eventos`: revisado
- `Financeiro`: revisado
- `Gamificacao`: revisado nos pontos de contraste e consistencia do formulario
- `Dashboard`: revisado nos cards e consistencia de leitura

## Padroes Consolidados

### 1. Contraste em fundo escuro

Regra obrigatoria para o Admin:

- textos principais em cards, tabelas e paineis devem declarar `color: "#fff"` quando houver risco de heranca de cor escura
- textos de apoio devem usar `rgba(255,255,255,0.7)` ou `rgba(255,255,255,0.55)`
- labels e metadados devem usar `rgba(255,255,255,0.5)`

Aplicar principalmente em:

- nome principal de membro, candidato, evento ou registro financeiro
- valores monetarios e totais
- datas e localizacoes que aparecem em tabelas
- titulos de formularios laterais

### 2. Tabelas do Admin

Quando a tabela estiver em fundo `#1a1a1a`, o padrao visual esperado e:

- cabecalho com `rgba(255,255,255,0.5)`
- linha principal com texto branco
- linha secundaria com texto muted
- celulas numericas importantes com texto branco explicito

Nao confiar apenas na cor herdada do container.

### 3. Formularios laterais

Painel lateral de criacao/edicao deve seguir estas regras:

- `minWidth: 0` nos blocos principais e nos controles
- grupos de 2 colunas devem quebrar automaticamente com `repeat(auto-fit, minmax(...))`
- botoes finais podem usar `flexWrap: "wrap"` quando houver mais de uma acao
- o container lateral deve aceitar empilhamento abaixo da lista em larguras menores

Esse padrao foi validado principalmente na tela de `Eventos`.

### 4. Inputs e selects reutilizaveis

Os estilos base devem continuar assim:

```ts
const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#252525",
  color: "#fff",
  fontSize: "0.875rem"
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "10px 32px 10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#252525",
  color: "#fff",
  fontSize: "0.875rem",
  appearance: "none" as const,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  cursor: "pointer"
};
```

`minWidth: 0` agora faz parte do padrao.

### 5. Feedback e acessibilidade

Mensagens de retorno no topo das paginas devem seguir:

- `role="status"`
- `aria-live="polite"`

Controles sem texto visivel em estado colapsado devem manter nome acessivel por `aria-label`.

### 6. Upload de imagem por arquivo

Para recursos visuais administrados no painel:

- manter campo de URL manual como fallback
- preferir tambem uma entrada por arquivo quando o fluxo pedir imagem de capa ou avatar
- apos upload bem-sucedido, preencher automaticamente a URL persistida no formulario

Esse padrao ja foi aplicado na tela de `Eventos` com upload de capa por arquivo.

## Telas Revisadas

### Membros

- contraste corrigido em tabela e formulario
- validade em `date` local
- labels, ids e autocomplete padronizados

### Adesoes

- contraste corrigido no card/lista do candidato
- contraste corrigido no painel lateral
- hierarquia de textos padronizada com estilos primary/secondary/muted

### Eventos

- contraste corrigido na lista e no formulario lateral
- layout de lista + painel lateral tornado responsivo
- grupos de campos com quebra automatica
- upload de capa por arquivo adicionado, mantendo URL manual

### Financeiro

- contraste corrigido nos nomes e valores da tabela
- datas de pagamentos em branco quando exibidas em fundo escuro

### Gamificacao

- contraste de cards e formularios alinhado ao padrao atual
- lider exibido com nome em destaque e pontuacao como apoio

## Checklist Para Novas Telas

Antes de considerar uma nova tela do Admin como pronta, conferir:

- texto principal esta branco em todo bloco escuro
- valores importantes nao dependem de cor herdada
- labels e metadados usam tom secundario consistente
- formularios laterais quebram sem overflow
- inputs e selects usam `minWidth: 0`
- mensagens de feedback usam `role="status"`
- se houver imagem administravel, avaliar se precisa upload por arquivo alem de URL

## Arquivos de Referencia

- `docs/admin-design.md`
- `apps/admin/components/admin-shell.tsx`
- `apps/admin/app/adesoes/page.tsx`
- `apps/admin/app/events/page.tsx`
- `apps/admin/app/financeiro/page.tsx`
- `apps/admin/app/members/page.tsx`

Ultima atualizacao: Abril de 2026
Branch de referencia: `codex/pwa-redesign`
