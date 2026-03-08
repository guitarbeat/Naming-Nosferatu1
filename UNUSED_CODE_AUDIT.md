# Unused Code Audit

Date: 2026-03-09  
Scope: `src/`, `server/`, `scripts/`  
Method: `knip` (project-wide + src-only), `rg` reference tracing, manual file-level verification

## How This Audit Was Performed

1. Ran default `knip` against configured app entry (`src/app/main.tsx`).
2. Ran expanded `knip` with temporary config including `src`, `server`, and `scripts` with entries:
   - `src/app/main.tsx`
   - `server/index.ts`
3. Manually verified each finding with `rg` searches for imports/usages and checked `package.json` scripts.
4. Scanned all tracked code files (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.css`) for low-reference candidates.

## High-Confidence Unused Code

These items have no in-repo runtime/test imports and no npm script wiring.

1. `src/features/tournament/hooks/useTournamentSelectionSaver.ts`
   - Exported hook is never imported.
   - Evidence: only self-references found.
   - Key lines: overloaded exports at lines 29-33.

2. `src/features/tournament/hooks/useTournamentSelectionSaver.bench.ts`
   - Benchmark file not wired into test/bench scripts.
   - Evidence: no references outside file.

3. `src/shared/components/layout/LiquidGradient.css`
   - Not imported by any TS/TSX/CSS file.
   - Current app background is driven by:
     - `src/shared/components/layout/AppLayout.tsx`
     - `src/styles/components.css`

## Likely Unused (Manual/One-off Scripts)

These are standalone scripts with no package script references. They may be intentionally kept for ad hoc local use.

1. `scripts/benchmark_insert.ts`
2. `scripts/benchmark_leaderboard.ts`
3. `scripts/benchmark_popularity.ts`
4. `scripts/benchmark-stats.ts`
5. `scripts/test-admin-functions.js`

Notes:
- `package.json` does not expose commands for these files.
- If these are still useful, move them under a documented `scripts/manual/` section and add README usage.

## Unused Exports / Types (From Knip)

These do not currently affect runtime, but they add surface area and maintenance overhead.

1. `server/db.ts:28`
   - `pool` export is unused (the `db` export is used; `pool` is not imported elsewhere).

2. `server/validation.ts:41-46`
   - Unused exported type aliases:
     - `CreateNameInput`
     - `CreateUserInput`
     - `UpdateHideInput`
     - `UpdateLockInput`
     - `BatchHideInput`
     - `SaveRatingsInput`

3. `scripts/vite-console-forward-plugin.ts:19`
   - `ConsoleForwardOptions` is exported but not imported outside the file.
   - Can be non-exported interface.

4. `src/integrations/supabase/types.ts:683-777`
   - Unused exported helper types:
     - `Tables`
     - `TablesInsert`
     - `TablesUpdate`
     - `Enums`
     - `CompositeTypes`
   - Caution: generated types may be intentionally exported for future developer ergonomics.

## Already Cleaned During This Session

1. Removed unused selectors:
   - `.cat-background__sky`
   - `.cat-background__star`
2. Removed unused animation keyframe:
   - `@keyframes twinkle`

## Recommended Removal Order

1. Remove truly orphaned source files first:
   - `useTournamentSelectionSaver.ts`
   - `useTournamentSelectionSaver.bench.ts`
   - `LiquidGradient.css`
2. Convert/remove unused exports:
   - `pool` export in `server/db.ts`
   - type exports in `server/validation.ts`
   - `ConsoleForwardOptions` export
3. Decide policy for manual scripts:
   - delete, or
   - keep but document + relocate (`scripts/manual/`).

## Validation Command After Each Cleanup

```bash
pnpm lint && pnpm test -- --run src/app/App.test.tsx src/test/features/tournament/TournamentFlow.test.tsx && pnpm build
```

