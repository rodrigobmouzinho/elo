# Padrão de Design - Elo Admin

Este documento define o padrão de design para todas as páginas do painel administrativo Elo.

---

## 1. Visão Geral

O design do admin segue os princípios de **minimalismo funcional**: interface limpa, focada no essencial, sem complexidade visual desnecessária.

### Valores do Design

- **Simplicidade:** Apenas o necessário na tela
- **Funcionalidade:** Elementos de tamanho padrão, UI intuitiva
- **Consistência:** Mesmo padrão em todas as páginas

---

## 2. Estrutura Base

### Layout Geral

```
┌─────────────────────────────────────────────────────┐
│ [Logo] [Botão collapse]                             │  ← Sidebar (220px→72px)
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │  ← Cards de métricas
│  │Card1│ │Card2│ │Card3│ │Card4│                   │
│  └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │  ← Conteúdo principal
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Configuração do Layout (layout.tsx)

```tsx
// Tema escuro como padrão
<html lang="pt-BR" data-theme="dark">
```

---

## 3. Sidebar (Menu)

### Estrutura do Componente

- **Localização:** `apps/admin/components/admin-shell.tsx`
- **Layout:** Flexbox com collapse
- **Largura:** 220px expandido | 72px recolhido

### Especificações

| Propriedade | Valor                                             |
| ----------- | ------------------------------------------------- |
| Padding     | `24px 16px` (expandido) / `16px 12px` (recolhido) |
| Background  | `#131313`                                         |
| Border      | `1px solid rgba(255,255,255,0.06)`                |
| Transição   | `200ms ease`                                      |

### Logo

```tsx
<Image src="/brand/elo-mark.png" width={56} height={56} />
```

### Botão de Collapse

- Ícone: `ChevronLeft` / `ChevronRight`
- Tamanho: `32px x 32px`
- Border-radius: `6px`

### Itens de Navegação

```tsx
<Link
  style={{
    height: "44px", // Altura fixa padrão
    padding: "0 12px", // Padding padrão
    borderRadius: "8px", // Border-radius padrão
    gap: "10px",
    fontSize: "0.875rem", // 14px
    fontWeight: 500
  }}
>
  <span style={{ width: "28px", height: "28px" }}>{icon}</span>
  {label}
</Link>
```

| Propriedade   | Valor                      |
| ------------- | -------------------------- |
| Altura        | `44px`                     |
| Padding       | `0 12px` (12px horizontal) |
| Gap           | `10px`                     |
| Border-radius | `8px`                      |
| Font-size     | `0.875rem` (14px)          |
| Font-weight   | `500`                      |

### Botão Sair

- Estilo similar aos itens de navegação
- Cor: `rgba(255,255,255,0.5)`
- Posição: Rodapé do menu (`marginTop: "auto"`)

---

## 4. Dashboard - Cards de Métricas

### Estrutura do Componente

- **Localização:** `apps/admin/app/page.tsx`
- **Layout:** Grid com 4 colunas

### Especificações dos Cards

```tsx
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px"
  }}
>
  <Card>...</Card>
</div>
```

### Estilo do Card

```tsx
const cardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "20px",
  borderRadius: "12px",
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.06)"
};
```

| Propriedade   | Valor                              |
| ------------- | ---------------------------------- |
| Padding       | `20px`                             |
| Border-radius | `12px`                             |
| Background    | `#1a1a1a`                          |
| Border        | `1px solid rgba(255,255,255,0.06)` |
| Gap           | `8px`                              |

### Estilo do Label

```tsx
const cardLabelStyle = {
  fontSize: "0.75rem", // 12px
  fontWeight: 600,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};
```

### Estilo do Valor

```tsx
const cardValueStyle = {
  fontSize: "1.75rem", // 28px
  fontWeight: 700,
  color: "#fff"
};
```

---

## 5. Cores

### Paleta Principal

| Uso                   | Cor                      |
| --------------------- | ------------------------ |
| Background principal  | `#131313`                |
| Background cards      | `#1a1a1a`                |
| Texto principal       | `#fff`                   |
| Texto secundário      | `rgba(255,255,255,0.6)`  |
| Texto terciário/muted | `rgba(255,255,255,0.5)`  |
| Borda sutil           | `rgba(255,255,255,0.06)` |
| Accent (brand)        | `#865aff`                |
| Accent hover          | `#9370ff`                |
| Sucesso               | `#22c55e`                |
| Alerta                | `#f59e0b`                |
| Erro                  | `#ef4444`                |

---

## 6. Componentes UI

### AdminShell (Shell Customizado)

O `AdminShell` não depende da biblioteca `@elo/ui`. É um componente customizado com:

- Autenticação integrada (verifica token, redirect para login)
- Sidebar com collapse
- Logo símbolo no topo
- Navegação com 6 itens fixos
- Botão de logout

### Exemplos de Uso

```tsx
import { AdminShell } from "../components/admin-shell";

export default function MinhaPagina() {
  return (
    <AdminShell>
      <div>Meu conteúdo aqui</div>
    </AdminShell>
  );
}
```

---

## 7. Boas Práticas

### ✅ Faça

- Use o `AdminShell` em todas as páginas
- Mantenha 4 cards de métricas no topo do dashboard
- Use cores da paleta definida
- Mantenha altura de botões em `44px`
- Use padding padrão de `12px` a `16px`

### ❌ Não Faça

- Não use gradientes complexos
- Não use textos longos ou descrições densas
- Não use a biblioteca `@elo/ui` para o layout base
- Não crie tabelas desnecessárias
- Não use tamanhos arbitrários para botões

---

## 8. Aplicação em Outras Páginas

Ao criar uma nova página no admin:

1. **Use o AdminShell:**

   ```tsx
   import { AdminShell } from "../components/admin-shell";

   export default function NovaPagina() {
     return <AdminShell>{/* seu conteúdo */}</AdminShell>;
   }
   ```

2. **Cards de métricas (se aplicável):**

   ```tsx
   const cardStyle = {
     padding: "20px",
     borderRadius: "12px",
     background: "#1a1a1a",
     border: "1px solid rgba(255,255,255,0.06)"
   };
   ```

3. **Menu lateral** já está incluso no AdminShell - não precisa criar novamente.

---

## 9. Referência

Última atualização: 15/04/2026

Padrão aplicado em:

- Login (`apps/admin/app/login/page.tsx`)
- Dashboard (`apps/admin/app/page.tsx`)
- Menu (`apps/admin/components/admin-shell.tsx`)
