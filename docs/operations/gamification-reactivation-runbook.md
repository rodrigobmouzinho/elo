# Gamification Reactivation Runbook

## Objective

Re-enable the preserved gamification module when the product roadmap is ready to expose it again in API, Admin, and PWA.

## Feature Switches

Set the following values in the target environment:

- API: `GAMIFICATION_ENABLED=true`
- Admin: `NEXT_PUBLIC_GAMIFICATION_ENABLED=true`
- PWA: `NEXT_PUBLIC_GAMIFICATION_ENABLED=true`

## Preconditions

Before reactivating:

1. Confirm the preserved implementation snapshot in `docs/architecture/gamification-current-state.md`.
2. Confirm the target database still contains the gamification tables:
   - `seasons`
   - `points_ledger`
   - `badges`
   - `member_badges`
3. Confirm there is at least one valid season ready for use.
4. Review whether the fixed top-3 badge rules are still enough for the new product phase.

## Verification Checklist

After turning the flags on:

1. Open Admin and confirm the gamification module reappears in navigation.
2. Open `/gamification` in Admin and confirm:
   - seasons load
   - ranking loads
   - point launch form is accessible
   - badge processing action is accessible
3. Open PWA and confirm the gamification entry reappears in navigation.
4. Open `/gamificacao` in PWA and confirm:
   - current season ranking loads
   - member position and points render
   - hall of fame renders when closed seasons exist
5. Run the preserved gamification integration suite:
   - `gamification-visibility-disabled.test.ts`
   - `gamification-seasons-activation.test.ts`
   - `gamification-points-launch.test.ts`
   - `gamification-ranking-app.test.ts`
   - `gamification-season-history-champions.test.ts`
   - `gamification-badges-job.test.ts`
6. Validate one controlled end-to-end scenario:
   - create or activate a season
   - confirm event participation for a member
   - launch points
   - verify ranking update
   - process badges

## Rollback

If reactivation needs to be reversed quickly:

1. Set the three gamification flags back to `false`.
2. Redeploy API, Admin, and PWA.
3. Keep the data intact. No rollback should delete seasons, points, badges, or grants.

## Related Files

- `docs/architecture/gamification-current-state.md`
- `docs/superpowers/plans/2026-04-26-ocultar-gamificacao.md`
- `docs/architecture/API-CONTRACT.md`
- `docs/testing/test-plan.md`
