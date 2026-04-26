# Padrao de Design - Elo Admin

Este documento define o padrao visual e estrutural para todas as paginas do painel administrativo Elo.

---

## 1. Visao Geral

O Admin segue os principios de minimalismo funcional: interface escura, limpa, com foco em leitura, operacao rapida e consistencia entre telas.

### Valores do Design

- Simplicidade
- Funcionalidade
- Consistencia
- Legibilidade
- Reuso de padroes

---

## 2. Estrutura Base

### Layout Geral

- tema escuro como padrao
- sidebar fixa com estado expandido/recolhido
- area principal com cards de metricas no topo quando fizer sentido
- bloco de conteudo principal em fundo `#1a1a1a`

### AdminShell

- localizacao: `apps/admin/components/admin-shell.tsx`
- largura da sidebar: `220px` expandida, `72px` recolhida
- background principal: `#131313`
- cards e paineis: `#1a1a1a`
- borda sutil: `1px solid rgba(255,255,255,0.06)`

---

## 3. Paleta e Contraste

### Paleta Principal

| Uso | Cor |
| --- | --- |
| Background principal | `#131313` |
| Background cards | `#1a1a1a` |
| Control background | `#252525` |
| Texto principal | `#fff` |
| Texto secundario | `rgba(255,255,255,0.7)` |
| Texto muted | `rgba(255,255,255,0.5)` |
| Texto muted reforcado | `rgba(255,255,255,0.55)` |
| Accent | `#865aff` |
| Sucesso | `#22c55e` |
| Alerta | `#f59e0b` |
| Erro | `#ef4444` |

### Regra de Contraste

Em qualquer superficie escura do Admin:

- textos principais devem usar `#fff`
- textos secundarios devem usar `rgba(255,255,255,0.7)`
- labels, metadados e texto de apoio devem usar `rgba(255,255,255,0.5)` ou `rgba(255,255,255,0.55)`

Nao depender de cor herdada para:

- nome principal em tabelas
- valores monetarios ou numericos importantes
- datas e localizacoes em listas
- titulos de formularios laterais

---

## 4. Cards de Metricas

### Card base

```tsx
const cardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "16px",
  borderRadius: "12px",
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.06)"
};
```

### Label

```tsx
const cardLabelStyle = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};
```

### Valor

```tsx
const cardValueStyle = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#fff"
};
```

---

## 5. Inputs, Selects e Formularios

### Estilos base

```tsx
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

`minWidth: 0` faz parte do padrao.

### Formularios laterais

Para telas com lista + painel lateral:

- preferir layout fluido
- permitir empilhamento do painel abaixo da lista em larguras menores
- usar `minWidth: 0` nos blocos criticos
- grupos de duas colunas devem quebrar com `repeat(auto-fit, minmax(...))`
- botoes finais podem usar `flexWrap: "wrap"`

---

## 6. Tabelas

Padrao minimo para tabelas em fundo `#1a1a1a`:

- cabecalho com texto muted
- linha principal com texto branco
- linha secundaria com texto muted
- valores importantes com cor branca explicita
- acoes alinhadas a direita quando fizer sentido

Exemplos de campos que devem receber cor explicita:

- nome de membro
- nome de evento
- valor em dinheiro
- data importante quando o fundo for muito escuro

---

## 7. Feedback e Acessibilidade

### Feedback visual

Alertas e mensagens no topo das telas devem usar:

```tsx
role="status"
aria-live="polite"
```

### Nomes acessiveis

Quando um botao ou link perde texto visivel em algum estado, manter:

- `aria-label`
- `aria-expanded` quando aplicavel
- `aria-current` em navegacao ativa

---

## 8. Upload de Imagem

Quando a tela administrar imagem de capa, avatar ou imagem de apoio:

- manter campo de URL manual como fallback
- oferecer upload por arquivo quando o fluxo for operacional
- preencher automaticamente a URL do formulario apos upload bem-sucedido
- manter preview visual atualizado

Esse padrao ja foi aplicado em `Eventos`.

---

## 9. Boas Praticas

### Faca

- use o `AdminShell` em todas as paginas
- reuse `cardStyle`, `inputStyle` e `selectStyle`
- declare contraste explicitamente em textos principais sobre fundo escuro
- garanta quebra sem overflow em formularios laterais
- reuse o padrao de upload por arquivo quando a tela gerenciar imagens

### Nao faca

- nao deixe nome, valor ou data importante depender de cor herdada
- nao use grids fixos de formulario que comprimam campos ate ultrapassar a borda
- nao use gradientes ou adornos visuais que fujam da linguagem atual do admin
- nao misture mais de um comportamento visual para tabelas equivalentes

---

## 10. Aplicacao em Novas Paginas

Ao criar ou revisar uma nova tela do Admin:

1. usar `AdminShell`
2. aplicar a paleta escura padrao
3. validar contraste dos textos principais
4. garantir responsividade do conteudo principal e do painel lateral
5. avaliar se ha necessidade de upload por arquivo para imagens gerenciadas
6. conferir feedback acessivel com `role="status"`

---

## 11. Referencia Atual

Padrao ja aplicado em:

- `apps/admin/components/admin-shell.tsx`
- `apps/admin/app/page.tsx`
- `apps/admin/app/members/page.tsx`
- `apps/admin/app/adesoes/page.tsx`
- `apps/admin/app/events/page.tsx`
- `apps/admin/app/financeiro/page.tsx`
- `apps/admin/app/gamification/page.tsx`

Ultima atualizacao: Abril de 2026
Branch de referencia: `codex/pwa-redesign`
