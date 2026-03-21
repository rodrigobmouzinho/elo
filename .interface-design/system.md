# Elo Executive Social System

## Direction and Feel
- Product context: networking operations with two lenses: executive control for admins and social discovery for members.
- Experience intent:
  - Admin: decisive, dense, trustworthy, fast to scan.
  - PWA: alive, social, aspirational, easy to act on.
- Signature element: `Orbital Connector`.
  - The Elo symbol becomes a product cue for active navigation, featured states, avatar halos, empty states, and sectional ornaments.

## Brand Anchors
- Visual voice from the brandbook: moderna, tecnologica, seria.
- Core colors remain:
  - graphite black: `#000000`
  - orbit purple: `#865AFF`
  - ice white: `#F0F5FF`
- Brand assets:
  - wordmark: `/brand/elo-wordmark.png`
  - symbol: `/brand/elo-mark.png`

## Depth Strategy
- Strategy: border-first + quiet shadows.
- No inflated cards, no decorative glow, no loud gradients carrying hierarchy.
- Layering:
  - `rail`: darker operational frame
  - `canvas`: page atmosphere
  - `panel`: main work surface
  - `dock`: floating social navigation
  - `overlay`: side panel / action layer

## Spacing and Radius
- Base spacing unit: 4px.
- Preferred spacing rhythm:
  - micro: 4 / 8
  - control: 12 / 16
  - section: 20 / 24
  - shell: 28 / 32
- Radius system:
  - compact: 10px
  - panel: 14px
  - hero: 20px

## Typography
- `Kurino` is reserved for brand moments, hero headers, discovery titles, and featured states.
- `Anek Latin` is the operational engine for all UI labels, navigation, tables, filters, forms, and body text.
- `JetBrains Mono` is mandatory for metrics, currency blocks, IDs, TXID, PIX copy/paste, and machine-readable values.
- Hierarchy rules:
  - Admin headings are tighter and more restrained.
  - PWA headings are more expressive and editorial.

## Component Patterns
- Shared primitives:
  - `LogoWordmark`, `LogoMark`
  - `PageHeader`, `MetricStrip`, `PriorityStrip`, `FilterBar`
  - `DataTable`, `EntityList`, `SidePanelForm`, `SectionTabs`
  - `FeedCard`, `SocialStatPill`, `EmptyState`
- Admin shell:
  - left rail in graphite with brand, active workspace context and module navigation
  - sticky top context bar with current module and session identity
  - tables and list surfaces as the default information container
  - side panel forms instead of stacked page forms
- PWA shell:
  - mobile uses branded top app bar and floating bottom dock with icons + short labels
  - desktop uses a slim social rail plus contextual top bar, avoiding a stretched mobile dock on wide screens
  - editorial feed surfaces mixed with fast actions
  - cards are used for storytelling, not as the default wrapper for every object
- Tables and lists:
  - every admin CRUD starts from filters and rows, not from a giant form
  - actions are row-scoped and visually quiet until needed
  - status should read in one glance through compact pills, not oversized cards

## Screen Signatures
- Admin dashboard:
  - command center with `Acoes agora`, KPI strip, operational health, and pending queues
  - must degrade gracefully on partial API failure so one broken module does not blank the executive view
  - should open as a `mesa de turno`, with a dark executive band for caixa, agenda and base before lighter diagnostic tables
  - the first fold must answer three questions immediately: what is blocked, what is stable, and which module deserves the next click
- Admin modules:
  - `Membros`, `Eventos`, `Financeiro`, `Gamificacao` are table-first with sticky filters and right-side action panels
  - `Membros` should open as a CRM desk with base quality, activation backlog, and local coverage visible before the table
  - `Eventos` should surface cover quality, access model, schedule and action state directly in the table row
  - `Financeiro` should open with a dark `mesa de caixa`, a critical band of decisions, and a right-side approval radar instead of generic support cards
- PWA home:
  - social discovery feed with featured event, people to meet, community pulse, and event stream
  - hero must combine discovery copy, a featured event rail, and a compact `radar do dia` so the screen feels like a social product, not a member portal
- Event detail:
  - editorial hero + transational checkout journey with explicit step guidance
  - price, status and confirmation state must be legible before the user reaches the PIX block
- Directory:
  - avatar-first rows with quick connect and WhatsApp actions
  - discovery should begin with a social radar that suggests whom to approach now, not only a searchable list
- Profile and Projects:
  - social reputation, completeness, and participation state are visible before forms
  - `Perfil` should open as a living member dossier, with public-read signals and the next improvement visible before editable fields
  - `Projetos` should combine an opportunity radar with a publish desk so discovery and creation coexist in the same flow
- Gamification:
  - current-user emphasis, readable podium, and collectible season history
  - the right column should feel like a personal race card, with gap-to-leader and momentum visible at a glance
  - the page should read as a live social race, not a dry leaderboard, even when ranking volume is still low
  - empty states must preserve aspiration by showing narrative, next steps and the promise of season memory

## Guardrails
- One visual language across Admin and PWA, with density changing by context rather than changing the whole system.
- Do not fallback to generic card grids for admin surfaces.
- Do not use Kurino for dense operational text.
- Keep brand purple meaningful and concentrated.
- Use the orbital mark repeatedly enough to create identity, but never as decoration without purpose.
- Every new screen must prove:
  - clear first action
  - visible information hierarchy
  - responsive behavior
  - keyboard focus integrity
  - brand fidelity
