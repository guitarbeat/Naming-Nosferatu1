# Manageability Plan

## Purpose

Make the codebase easier to understand and safer to change without breaking behavior.
This is an execution plan for incremental cleanup, not a big-bang rewrite.

## Baseline (2026-03-07)

- `src` files: **118**
- `src` lines (all file types): **32,021**
- Test files in `src`: **26**
- Biggest top-level `src` areas by file count:
  - `services`: 41
  - `shared`: 35
  - `features`: 21
- Biggest hot spots:
  - `src/services/integration/*`: 29 files
  - `src/shared/components/*`: 24 files
  - `src/features/tournament/*`: 15 files
- Largest files (lines):
  - `src/features/tournament/components/NameSelector.tsx`: 1,560
  - `src/features/tournament/Tournament.tsx`: 1,165
  - `src/store/appStore.ts`: 555
  - `src/services/errorManager.ts`: 564
  - `src/styles/components.css`: 1,023
- `knip` signals:
  - Unused file: `src/integrations/supabase/client.ts`
  - Unused deps: `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`

## Current Snapshot (After Batch 7)

- `src` files: **105** (down from 118; some count was reintroduced by intentional modular splits)
- Runtime-focused `src` no longer contains integration tooling/tests
- Validation status: `pnpm lint`, `pnpm test`, `pnpm build` all passing on latest refactor state

## Success Criteria

- Reduce `src` file count from 118 to **<= 85**.
- No UI/component file above **700 lines**.
- No store or service file above **450 lines**.
- Remove dead code flagged by static analysis (`knip`, architecture boundaries, TS checks).
- Keep `pnpm lint`, `pnpm test`, and `pnpm build` passing after each phase.

## Execution Rules

- Work in small PR-sized batches (1-3 related changes).
- Preserve behavior first; refactor structure second.
- Always end each batch with:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Track metrics after each batch in this doc.

## Phase Plan

### Phase 1: Quick Wins (Low Risk, High Return)

Goal: remove obvious dead/unused surface area.

- [x] Remove `src/integrations/supabase/client.ts` if no runtime usage appears.
- [x] Decide whether Capacitor is actually used:
  - If not used, remove Capacitor dependencies and related config.
  - If used, document exactly where and why.
- [x] Audit `src/services/integration/` ownership:
  - Confirm runtime usage vs test-only tooling.
  - Move docs/tooling-only files out of runtime `src` if appropriate.
- [x] Re-run `knip` and record remaining findings.

Batch 1 notes:
- `src/integrations/supabase/client.ts` had no runtime imports and was deleted.
- Removed unused dependencies: `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`.
- `@capacitor/cli` remains for `capacitor.config.ts` typing/tooling.
- `src/services/integration/*` is currently test/tooling-focused and not imported by runtime app code.
- Remaining `knip` findings are unused exports/types (no unused files/deps).

Exit criteria:
- At least 5-10 files removed or moved out of runtime surface.
- No behavior changes.

### Phase 2: Split Oversized Tournament UI

Goal: make feature code understandable by reducing giant files.

- [x] Break `NameSelector.tsx` into subcomponents:
  - Search/filter panel
  - Selected names list
  - Admin controls
  - Empty and loading states
- [x] Break `Tournament.tsx` into route-level container + presentational pieces.
- [x] Keep all existing props contracts stable while splitting.

Exit criteria:
- `NameSelector.tsx` <= 700 lines.
- `Tournament.tsx` <= 700 lines.

### Phase 3: Store and Service Boundaries

Goal: reduce global coupling and single-file complexity.

- [x] Split `src/store/appStore.ts` into slices:
  - `user`
  - `tournament`
  - `ui/preferences`
- [x] Extract error handling policy from `src/services/errorManager.ts` into focused modules.
- [ ] Keep dependency direction aligned with `docs/project-structure-plan.md`.

Exit criteria:
- `appStore.ts` <= 450 lines.
- `errorManager.ts` <= 450 lines.

### Phase 4: CSS Surface Simplification

Goal: reduce style sprawl and improve discoverability.

- [ ] Categorize current style files into:
- [x] Categorize current style files into:
  - base/tokens
  - layout
  - components
  - feature-specific
- [x] Move tournament-only styles near tournament feature where possible.
- [ ] Remove duplicate/obsolete utility classes.

Exit criteria:
- Clear ownership for each CSS file.
- `src/styles/components.css` reduced below 700 lines or split by ownership.

### Phase 5: Validation and Guardrails

Goal: prevent the codebase from drifting back.

- [ ] Add or tighten lint checks for architecture boundaries.
- [ ] Add CI checks for dead files/exports (or at least report mode).
- [ ] Update `docs/CONTRIBUTING.md` with file-size and ownership rules.

Exit criteria:
- New guardrails run in CI and are documented.

## Tracking Table

| Date | Batch | What Changed | File Count | Notes |
| --- | --- | --- | --- | --- |
| 2026-03-07 | Baseline | Initial inventory and phased plan | 118 | Starting point |
| 2026-03-07 | Batch 1 | Removed dead Supabase client file, removed 3 unused Capacitor deps, validated integration folder is non-runtime | 117 | `pnpm lint`, `pnpm test`, `pnpm build` passed |
| 2026-03-07 | Batch 2 | Moved integration tooling/tests from `src/services/integration/*` to `scripts/integration/*` | 88 | Runtime `src` is now focused on app code |
| 2026-03-07 | Batch 3 | Split `NameSelector.tsx` into focused view components + admin-action hook | 92 | `NameSelector.tsx` reduced from 1,560 to 615 lines; full checks passed |
| 2026-03-07 | Batch 4 | Split `Tournament.tsx` into active view, completion view, bracket, match card, and UI helper module | 97 | `Tournament.tsx` reduced from 1,165 to 467 lines; full checks passed |
| 2026-03-07 | Batch 5 | Extracted error-management internals into `errorManagerCore` + constants module | 99 | `errorManager.ts` reduced from 564 to 52 lines; core split preserves behavior |
| 2026-03-07 | Batch 6 | Modularized `src/store/appStore.ts` into typed slices + store utilities while preserving API exports | 104 | `appStore.ts` reduced from 555 to 42 lines; `pnpm lint`, `pnpm test`, `pnpm build` passed |
| 2026-03-07 | Batch 7 | Split tournament-specific styles from `components.css` into new `tournament.css` and updated style imports | 105 | `components.css` reduced from 1,023 to 599 lines; `pnpm lint`, `pnpm test`, `pnpm build` passed |

## Next Batch (Recommended)

**Batch 8: Remaining Large File Pass**

1. Split `src/shared/components/layout/Card/Card.tsx` below 700 lines.
2. Split `src/shared/hooks/index.ts` and `src/app/providers/Providers.tsx` into focused modules.
3. Decide whether generated `src/integrations/supabase/types.ts` should be exempt from file-size limits.
