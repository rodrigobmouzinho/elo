# Ocultar Gamificacao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the gamification experience from the current product release across API, Admin, and PWA without deleting the existing implementation, preserving all code and knowledge for future reactivation.

**Architecture:** Introduce a small feature gate that becomes the single switch for gamification visibility, then route all API and UI entry points through that gate. Keep persistence, migrations, repository logic, tests, and archival docs in place so the feature can be reactivated with minimal reconstruction work.

**Tech Stack:** Next.js App Router, Route Handlers, React, TypeScript, PNPM, Turborepo, Supabase, Vitest

---

## File Structure

### Files to Create

- `apps/api/lib/gamification-visibility.ts`
  Responsibility: central API-side source of truth for whether gamification is enabled and how disabled routes should respond.
- `apps/admin/lib/gamification-visibility.ts`
  Responsibility: admin-side flag reader for navigation and page gating.
- `apps/pwa/lib/gamification-visibility.ts`
  Responsibility: member-side flag reader for navigation and page gating.
- `apps/api/tests/integration/gamification-visibility-disabled.test.ts`
  Responsibility: prove that disabled mode blocks gamification routes while preserving non-gamification behavior.
- `docs/operations/gamification-reactivation-runbook.md`
  Responsibility: operational checklist to re-enable the module in the future.

### Files to Modify

- `apps/api/app/api/admin/gamification/seasons/route.ts`
- `apps/api/app/api/admin/gamification/seasons/[id]/activate/route.ts`
- `apps/api/app/api/admin/gamification/points/route.ts`
- `apps/api/app/api/admin/gamification/badges/process/route.ts`
- `apps/api/app/api/app/gamification/ranking/route.ts`
- `apps/admin/components/admin-shell.tsx`
- `apps/admin/app/gamification/page.tsx`
- `apps/pwa/components/member-shell.tsx`
- `apps/pwa/app/gamificacao/page.tsx`
- `apps/pwa/app/page.tsx`
- `apps/api/.env.local`
- `apps/admin/.env.local`
- `apps/pwa/.env.local`
- `README.md`
- `docs/architecture/API-CONTRACT.md`
- `docs/governance/traceability-matrix.md`
- `docs/testing/test-plan.md`

### Files to Preserve Without Functional Changes

- `supabase/migrations/20260314120000_init.sql`
- `supabase/seed.sql`
- `apps/api/lib/repositories.ts`
- `apps/api/lib/store.ts`
- Existing gamification integration tests, except for minor adjustments required by the new gate.

---

### Task 1: Introduce a Single Visibility Switch

**Files:**
- Create: `apps/api/lib/gamification-visibility.ts`
- Create: `apps/admin/lib/gamification-visibility.ts`
- Create: `apps/pwa/lib/gamification-visibility.ts`
- Modify: `apps/api/.env.local`
- Modify: `apps/admin/.env.local`
- Modify: `apps/pwa/.env.local`
- Test: `apps/api/tests/integration/gamification-visibility-disabled.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("gamification visibility flag", () => {
  it("disables gamification routes when the feature flag is false", async () => {
    process.env.ALLOW_MOCK_AUTH = "true";
    process.env.GAMIFICATION_ENABLED = "false";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

    const response = await rankingGet(
      new Request("http://localhost/api/app/gamification/ranking", {
        headers: { authorization: "Bearer mock-member-token" }
      })
    );

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @elo/api test -- gamification-visibility-disabled.test.ts`
Expected: FAIL because no visibility module or route guard exists yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/lib/gamification-visibility.ts
export function isGamificationEnabled() {
  return process.env.GAMIFICATION_ENABLED === "true";
}

export function disabledGamificationError() {
  return {
    status: 404,
    message: "Gamificacao indisponivel nesta versao do sistema"
  } as const;
}
```

```ts
// apps/admin/lib/gamification-visibility.ts
export function isGamificationEnabled() {
  return process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED === "true";
}
```

```ts
// apps/pwa/lib/gamification-visibility.ts
export function isGamificationEnabled() {
  return process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED === "true";
}
```

```env
# apps/api/.env.local
GAMIFICATION_ENABLED=false
```

```env
# apps/admin/.env.local
NEXT_PUBLIC_GAMIFICATION_ENABLED=false
```

```env
# apps/pwa/.env.local
NEXT_PUBLIC_GAMIFICATION_ENABLED=false
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @elo/api test -- gamification-visibility-disabled.test.ts`
Expected: PASS for the new shared gate after Task 2 wires it into the routes.

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/gamification-visibility.ts apps/admin/lib/gamification-visibility.ts apps/pwa/lib/gamification-visibility.ts apps/api/.env.local apps/admin/.env.local apps/pwa/.env.local apps/api/tests/integration/gamification-visibility-disabled.test.ts
git commit -m "chore: add gamification visibility flags"
```

### Task 2: Gate the API Routes Without Deleting Logic

**Files:**
- Modify: `apps/api/app/api/admin/gamification/seasons/route.ts`
- Modify: `apps/api/app/api/admin/gamification/seasons/[id]/activate/route.ts`
- Modify: `apps/api/app/api/admin/gamification/points/route.ts`
- Modify: `apps/api/app/api/admin/gamification/badges/process/route.ts`
- Modify: `apps/api/app/api/app/gamification/ranking/route.ts`
- Modify: `apps/api/tests/integration/gamification-visibility-disabled.test.ts`
- Test: `apps/api/tests/integration/gamification-seasons-activation.test.ts`
- Test: `apps/api/tests/integration/gamification-points-launch.test.ts`
- Test: `apps/api/tests/integration/gamification-ranking-app.test.ts`

- [ ] **Step 1: Extend the failing test to cover admin and member routes**

```ts
it("returns 404 for admin and member gamification endpoints when disabled", async () => {
  process.env.ALLOW_MOCK_AUTH = "true";
  process.env.GAMIFICATION_ENABLED = "false";

  const { GET: seasonsGet } = await import("../../app/api/admin/gamification/seasons/route");
  const { POST: pointsPost } = await import("../../app/api/admin/gamification/points/route");
  const { GET: rankingGet } = await import("../../app/api/app/gamification/ranking/route");

  const [seasonsResponse, pointsResponse, rankingResponse] = await Promise.all([
    seasonsGet(new Request("http://localhost/api/admin/gamification/seasons", { headers: { authorization: "Bearer mock-admin-token" } })),
    pointsPost(
      new Request("http://localhost/api/admin/gamification/points", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-admin-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          memberId: "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e",
          eventId: "434f5f2a-1bb2-43eb-b5ce-d7c9bb728d18",
          seasonId: "7b2b6d8b-2d68-47f1-b56c-a2d28383887d",
          points: 100,
          reason: "Teste de bloqueio"
        })
      })
    ),
    rankingGet(new Request("http://localhost/api/app/gamification/ranking", { headers: { authorization: "Bearer mock-member-token" } }))
  ]);

  expect(seasonsResponse.status).toBe(404);
  expect(pointsResponse.status).toBe(404);
  expect(rankingResponse.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @elo/api test -- gamification-visibility-disabled.test.ts`
Expected: FAIL because the route handlers still execute normally.

- [ ] **Step 3: Add the route guards**

```ts
import { disabledGamificationError, isGamificationEnabled } from "../../../../../lib/gamification-visibility";
import { fail } from "../../../../../lib/http";

if (!isGamificationEnabled()) {
  const disabled = disabledGamificationError();
  return fail(disabled.message, disabled.status);
}
```

Use the same pattern at the top of every gamification route handler before the repository logic runs. Preserve all existing imports, auth checks, schemas, and repository calls.

- [ ] **Step 4: Keep the existing gamification tests authoritative when enabled**

At the top of each existing gamification integration test, add:

```ts
process.env.GAMIFICATION_ENABLED = "true";
```

This keeps the current suite validating the dormant feature while the default release posture remains hidden.

- [ ] **Step 5: Run tests to verify behavior**

Run: `pnpm --filter @elo/api test -- gamification-visibility-disabled.test.ts gamification-seasons-activation.test.ts gamification-points-launch.test.ts gamification-ranking-app.test.ts gamification-season-history-champions.test.ts gamification-badges-job.test.ts`
Expected: PASS. Disabled visibility test returns 404. Existing gamification tests still pass when they explicitly enable the flag.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/api/admin/gamification apps/api/app/api/app/gamification apps/api/tests/integration/gamification-visibility-disabled.test.ts apps/api/tests/integration/gamification-*.test.ts
git commit -m "feat: gate gamification api routes"
```

### Task 3: Hide Gamification From the Admin Interface

**Files:**
- Modify: `apps/admin/components/admin-shell.tsx`
- Modify: `apps/admin/app/gamification/page.tsx`
- Modify: `apps/admin/lib/gamification-visibility.ts`
- Test: manual verification in local admin app

- [ ] **Step 1: Add a focused UI gating test plan in comments for the implementer**

```ts
// Manual acceptance:
// 1. With NEXT_PUBLIC_GAMIFICATION_ENABLED=false, the sidebar must not render "Gamificacao".
// 2. Direct access to /gamification must show a controlled unavailable state or redirect.
// 3. With NEXT_PUBLIC_GAMIFICATION_ENABLED=true, current admin behavior must remain unchanged.
```

- [ ] **Step 2: Hide the nav entry**

```ts
import { isGamificationEnabled } from "../lib/gamification-visibility";

const navItems = [
  { href: "/", label: "Visao geral", icon: <Gauge size={18} /> },
  { href: "/members", label: "Membros", icon: <Users2 size={18} /> },
  { href: "/adesoes", label: "Adesoes", icon: <UserRoundPlus size={18} /> },
  { href: "/events", label: "Eventos", icon: <CalendarDays size={18} /> },
  { href: "/financeiro", label: "Financeiro", icon: <CreditCard size={18} /> }
];

const visibleNavItems = isGamificationEnabled()
  ? [...navItems.slice(0, 4), { href: "/gamification", label: "Gamificacao", icon: <Trophy size={18} /> }, navItems[4]]
  : navItems;
```

- [ ] **Step 3: Gate the admin gamification page without deleting the existing screen**

```tsx
if (!isGamificationEnabled()) {
  return (
    <AdminShell>
      <div style={{ padding: "24px", color: "#fff" }}>
        <h1>Gamificacao oculta nesta versao</h1>
        <p>O modulo foi preservado no codigo e pode ser reativado futuramente.</p>
      </div>
    </AdminShell>
  );
}
```

- [ ] **Step 4: Run lint and a local smoke check**

Run: `pnpm --filter @elo/admin lint`
Expected: PASS

Run: `pnpm --filter @elo/admin dev`
Expected:
- sidebar no longer shows the module when the flag is false
- direct `/gamification` access is blocked gracefully

- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/admin-shell.tsx apps/admin/app/gamification/page.tsx apps/admin/lib/gamification-visibility.ts
git commit -m "feat: hide gamification in admin"
```

### Task 4: Hide Gamification From the PWA

**Files:**
- Modify: `apps/pwa/components/member-shell.tsx`
- Modify: `apps/pwa/app/gamificacao/page.tsx`
- Modify: `apps/pwa/app/page.tsx`
- Modify: `apps/pwa/lib/gamification-visibility.ts`
- Test: manual verification in local PWA

- [ ] **Step 1: Record the UI acceptance cases**

```ts
// Manual acceptance:
// 1. Bottom navigation must not show the gamificacao entry when disabled.
// 2. Direct access to /gamificacao must show unavailable messaging or redirect.
// 3. Home must not tease ranking-related content when the feature is hidden.
// 4. Turning the flag back to true must restore the current UI.
```

- [ ] **Step 2: Hide the PWA nav entry**

```ts
import { isGamificationEnabled } from "../lib/gamification-visibility";

const navItems = isGamificationEnabled()
  ? [
      { href: "/", label: "Eventos", icon: <CalendarDays size={18} strokeWidth={2.1} /> },
      { href: "/gamificacao", label: "Premios", icon: <Trophy size={18} strokeWidth={2.1} /> },
      { href: "/membros", label: "Membros", icon: <UsersRound size={18} strokeWidth={2.1} /> },
      { href: "/projetos", label: "Projetos", icon: <Rocket size={18} strokeWidth={2.1} /> }
    ]
  : [
      { href: "/", label: "Eventos", icon: <CalendarDays size={18} strokeWidth={2.1} /> },
      { href: "/membros", label: "Membros", icon: <UsersRound size={18} strokeWidth={2.1} /> },
      { href: "/projetos", label: "Projetos", icon: <Rocket size={18} strokeWidth={2.1} /> }
    ];
```

- [ ] **Step 3: Gate the gamification page**

```tsx
if (!isGamificationEnabled()) {
  return (
    <MemberShell>
      <section className={styles.statusCard}>
        <h2 className={styles.statusTitle}>Gamificacao em pausa</h2>
        <p className={styles.statusText}>
          Esta jornada foi preservada para uma proxima versao e pode ser reativada sem perda de historico.
        </p>
      </section>
    </MemberShell>
  );
}
```

- [ ] **Step 4: Remove home-level references to ranking while hidden**

If the homepage currently previews ranking or achievement content, wrap that section with:

```tsx
{isGamificationEnabled() ? <RankingPreviewSection /> : null}
```

If the file is not yet componentized, first extract the ranking teaser into a dedicated block local to `apps/pwa/app/page.tsx`, then gate only that block.

- [ ] **Step 5: Run lint and a local smoke check**

Run: `pnpm --filter @elo/pwa lint`
Expected: PASS

Run: `pnpm --filter @elo/pwa dev`
Expected:
- no bottom-nav link to `/gamificacao`
- direct `/gamificacao` access is blocked gracefully
- home no longer markets a hidden feature

- [ ] **Step 6: Commit**

```bash
git add apps/pwa/components/member-shell.tsx apps/pwa/app/gamificacao/page.tsx apps/pwa/app/page.tsx apps/pwa/lib/gamification-visibility.ts
git commit -m "feat: hide gamification in pwa"
```

### Task 5: Archive and Document the Dormant Feature

**Files:**
- Create: `docs/operations/gamification-reactivation-runbook.md`
- Modify: `README.md`
- Modify: `docs/architecture/API-CONTRACT.md`
- Modify: `docs/governance/traceability-matrix.md`
- Modify: `docs/testing/test-plan.md`
- Reference: `docs/architecture/gamification-current-state.md`

- [ ] **Step 1: Add a reactivation runbook**

```md
# Gamification Reactivation Runbook

## Preconditions

- Set `GAMIFICATION_ENABLED=true` in API.
- Set `NEXT_PUBLIC_GAMIFICATION_ENABLED=true` in Admin.
- Set `NEXT_PUBLIC_GAMIFICATION_ENABLED=true` in PWA.

## Validation

1. Open Admin and confirm the module reappears.
2. Open PWA and confirm the member route reappears.
3. Run gamification integration tests.
4. Confirm there is an active season in the target environment.
5. Validate points launch and badge processing with a controlled test member.
```

- [ ] **Step 2: Update project docs to reflect dormant status**

Add concise notes:

- `README.md`
  - mention that gamification is implemented but currently hidden behind release flags
- `docs/architecture/API-CONTRACT.md`
  - clarify that the contract remains preserved but routes are currently hidden when the feature gate is disabled
- `docs/governance/traceability-matrix.md`
  - mark the module as dormant for the current release train
- `docs/testing/test-plan.md`
  - distinguish dormant-feature regression tests from always-on flows

- [ ] **Step 3: Run documentation sanity checks**

Run: `pnpm lint`
Expected: PASS

Run: `pnpm test`
Expected: PASS

If the monorepo does not lint Markdown directly, still run the standard suite to catch collateral issues caused by TypeScript changes from earlier tasks.

- [ ] **Step 4: Commit**

```bash
git add docs/operations/gamification-reactivation-runbook.md README.md docs/architecture/API-CONTRACT.md docs/governance/traceability-matrix.md docs/testing/test-plan.md docs/architecture/gamification-current-state.md
git commit -m "docs: archive gamification for future reactivation"
```

### Task 6: Final Verification Before Merge

**Files:**
- Verify only; no required code changes unless failures are found

- [ ] **Step 1: Run targeted app and API validation**

Run: `pnpm --filter @elo/api test -- gamification-visibility-disabled.test.ts gamification-seasons-activation.test.ts gamification-points-launch.test.ts gamification-ranking-app.test.ts gamification-season-history-champions.test.ts gamification-badges-job.test.ts`
Expected: PASS

Run: `pnpm --filter @elo/admin lint`
Expected: PASS

Run: `pnpm --filter @elo/pwa lint`
Expected: PASS

- [ ] **Step 2: Run full repository validation**

Run: `pnpm lint`
Expected: PASS

Run: `pnpm test`
Expected: PASS

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Review dormant-feature behavior manually**

Expected:

- Admin has no visible gamification entry when disabled.
- PWA has no visible gamification entry when disabled.
- Direct gamification routes do not expose active functionality.
- Database structures and implementation files remain intact.
- Documentation clearly explains how to reactivate the feature later.

- [ ] **Step 4: Commit verification fixes if needed**

```bash
git add .
git commit -m "chore: finalize gamification hiding rollout"
```

## Self-Review

### Spec Coverage

The plan covers:

- hiding functionality in API, Admin, and PWA
- preserving code instead of deleting it
- saving historical and technical context in project files
- providing a future reactivation path

No user requirement is intentionally left uncovered.

### Placeholder Scan

The plan avoids `TODO`, `TBD`, and vague "handle later" instructions. The only conditional language is limited to homepage ranking teaser extraction because that depends on the current page composition, but the action remains explicit.

### Type Consistency

The same flag names are used throughout:

- API: `GAMIFICATION_ENABLED`
- Admin: `NEXT_PUBLIC_GAMIFICATION_ENABLED`
- PWA: `NEXT_PUBLIC_GAMIFICATION_ENABLED`

The same dormant-behavior concept is used across all layers:

- hidden navigation
- blocked direct access
- preserved implementation

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-26-ocultar-gamificacao.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
