# Gamification Current State

## Purpose

This document preserves the current gamification implementation so the feature can be hidden in the current release without losing the work already done. It is an architectural snapshot for future reactivation.

## Product Scope Already Implemented

The gamification module currently covers five delivered capabilities:

1. Season creation and activation by admins.
2. Manual point launches by admins tied to validated event participation.
3. Automatic badge granting for season leaders.
4. Current season ranking for members.
5. Closed season champion history for members.

The related backlog lineage is documented in `ELO-030`, `ELO-031`, `ELO-032`, `ELO-033`, and `ELO-034`.

## Database Model

Gamification persistence is backed by four tables introduced in `supabase/migrations/20260314120000_init.sql`.

- `public.seasons`
  Responsibility: stores timeboxed gamification seasons and the `active` switch.
- `public.points_ledger`
  Responsibility: stores point grants by member and season.
- `public.badges`
  Responsibility: stores reusable badge definitions.
- `public.member_badges`
  Responsibility: stores badge grants per member and optional season context.

Seed data currently provisions one active season in `supabase/seed.sql`.

## Shared Contracts

Shared validation and typing live in `packages/core`.

- `packages/core/src/schemas.ts`
  - `pointsLaunchSchema`
  - `seasonSchema`
- `packages/core/src/types.ts`
  - `SeasonRankingEntry`

These contracts are consumed by API route handlers and describe the canonical payload shapes for seasons, points, and ranking entries.

## API Surface

### Admin Routes

- `apps/api/app/api/admin/gamification/seasons/route.ts`
  - `GET` lists seasons.
  - `POST` creates a season.
- `apps/api/app/api/admin/gamification/seasons/[id]/activate/route.ts`
  - `POST` marks one season as active and deactivates the others.
- `apps/api/app/api/admin/gamification/points/route.ts`
  - `POST` launches points for a member in a season.
  - Requires `eventId`.
  - Validates confirmed event participation before writing points.
- `apps/api/app/api/admin/gamification/badges/process/route.ts`
  - `POST` runs the badge automation job.

### Member Route

- `apps/api/app/api/app/gamification/ranking/route.ts`
  - `GET` returns:
    - active season name
    - ranking entries with `memberId`, `name`, `points`, `rank`, `medals`
    - `champions` history for closed seasons

## Core Business Rules

The implementation logic is centralized in `apps/api/lib/repositories.ts`.

### Seasons

- `listSeasons()`
  Lists seasons ordered by latest start date.
- `createSeason()`
  Creates an inactive season.
- `activateSeason()`
  Ensures only one season remains active at a time.

### Points

- `launchPoints()`
  Writes a points ledger entry after route-level validation passes.
- `isEventParticipationValidated()`
  Requires `event_registrations.status = confirmed` for the supplied `eventId` and `memberId`.

### Ranking

- `getRanking()`
  Loads the active season.
  Aggregates points by member for the active season.
  Builds rank ordering by descending points.
  Computes champion history for already closed seasons.

### Badges

- `SEASON_BADGE_RULES`
  Current rule set is fixed:
  - rank 1 -> `ouro`
  - rank 2 -> `prata`
  - rank 3 -> `bronze`
- `processAutomaticBadgesJob()`
  Creates missing badge definitions if needed.
  Grants badges idempotently for the active season leaders.

## Admin Experience

The admin UI lives entirely in `apps/admin/app/gamification/page.tsx`.

Current screen responsibilities:

- Loads season list.
- Loads current ranking.
- Shows operational metrics.
- Creates new seasons.
- Activates a season.
- Launches points manually.
- Runs badge processing manually.

Navigation entry:

- `apps/admin/components/admin-shell.tsx`
  - `/gamification`

## PWA Experience

The member-facing UI lives in `apps/pwa/app/gamificacao/page.tsx` with styles in `apps/pwa/app/gamificacao/page.module.css`.

Current screen responsibilities:

- Loads current season ranking.
- Locates the authenticated member in the ranking.
- Shows a points and position hero.
- Derives achievement cards from ranking state.
- Shows the top 3 ranking.
- Shows a hall of fame with closed season champions.

Navigation entry:

- `apps/pwa/components/member-shell.tsx`
  - `/gamificacao`

## Test Coverage

Integration coverage already exists in `apps/api/tests/integration`.

- `gamification-seasons-activation.test.ts`
  Verifies season creation, activation, and ranking switch.
- `gamification-points-launch.test.ts`
  Verifies points only launch after validated participation.
- `gamification-ranking-app.test.ts`
  Verifies active season ranking payload.
- `gamification-season-history-champions.test.ts`
  Verifies champion history for closed seasons.
- `gamification-badges-job.test.ts`
  Verifies badge automation and idempotency.

## Dormant-State Recommendation

For the current product version, gamification should be hidden, not removed.

That means:

- Keep migrations and tables intact.
- Keep API route files and repository logic intact.
- Keep tests intact, adjusting them only if route visibility becomes feature-flagged.
- Hide navigation and direct page access in Admin and PWA.
- Disable public and admin route usage behind a feature switch or maintenance gate.
- Preserve this document and the paired deactivation plan.

## Reactivation Notes

When the product is ready to bring gamification back:

1. Re-enable the frontend navigation entries.
2. Re-enable the page routes and API endpoints.
3. Validate the active season and seed state in the target environment.
4. Re-run the integration suite for seasons, ranking, points, and badges.
5. Review whether the fixed top-3 badge rules are still sufficient or should evolve into configurable rules.

## Related Documentation

- `docs/architecture/API-CONTRACT.md`
- `docs/governance/traceability-matrix.md`
- `docs/testing/test-plan.md`
- `docs/backlog/backlog.md`
- `docs/superpowers/plans/2026-04-26-ocultar-gamificacao.md`
