# Project Structure Scalability Plan

**Status Snapshot:** March 15, 2026

## Goals
- Improve discoverability by grouping code by feature and shared domains.
- Reduce coupling by enforcing a one-way dependency flow: `app -> features -> shared`.
- Keep infrastructure and domain logic clearly separated.

## Current Progress Snapshot
- `src/app/`, `src/features/`, and `src/shared/` exist and are the primary homes for app shell, feature modules, and shared UI/utilities.
- `pnpm run check:maintenance` already enforces that `src/shared/` and `src/services/` do not import from `@/features/*`.
- Tooling now exposes explicit `@/app/*`, `@/features/*`, and `@/shared/*` aliases alongside the root `@/*` alias.
- Feature-local service extraction has started: tournament Elo/match helpers and analytics API wrappers now live under `src/features/*/services/`.
- Shared runtime infrastructure now lives under `src/shared/services/` (`apiClient`, `errorManager`, and Supabase runtime/api modules).
- Root-level `src/services/` is now mostly app-specific (`authAdapter`) plus integration/tooling modules, and `src/store/` remains active pending store modularization.

## Proposed Structure (inside `src/`)
```
src/
  app/
    main.tsx
    App.tsx
    providers/
  features/
    tournament/
      ui/
      hooks/
      services/
      types/
      store/
    analytics/
      ui/
      hooks/
      services/
      types/
  shared/
    ui/
    hooks/
    services/
    lib/
    types/
  assets/
  styles/
```

## Current-to-Target Mapping (Examples)
- `src/layout/*` → `src/shared/ui/*`
- `src/hooks/useBrowserState.ts` → split into:
  - `src/shared/hooks/useBrowserState.ts` (pure browser state)
  - `src/features/tournament/hooks/useOfflineSync.ts` (tournament-specific syncing)
- `src/hooks/useNames.ts` → `src/features/tournament/hooks/useNames.ts` (domain hook)
- `src/hooks/useValidatedForm.ts` → `src/shared/hooks/useValidatedForm.ts` (generic form hook)
- `src/services/supabase/*` → `src/shared/services/supabase/*`
- `src/services/tournament.ts` → `src/features/tournament/services/tournament.ts`
- `src/store/appStore.ts` → `src/app/store/appStore.ts` + feature slices in `src/features/*/store/`
- `src/utils/*` → `src/shared/lib/*`
- `src/types/index.ts` → split into `src/shared/types/` + `src/features/*/types/` as needed

## Scalability Bottlenecks Observed
- Global buckets (`layout/`, `hooks/`, `services/`, `utils/`) will become catch-alls and hide ownership.
- Feature-specific logic is currently reachable from global hooks (e.g., global hooks importing feature hooks/services), which creates hidden coupling.
- Infrastructure and domain services are mixed together, making the service layer harder to maintain.
- A monolithic store grows fast and complicates feature isolation.

## Dependency Direction Rules
- `app` may import from `features` and `shared`.
- `features` may import from `shared` only.
- `shared` must not import from `features` or `app`.
- Cross-feature imports should go through `shared` or a dedicated `shared` contract (types/helpers).

## Risks & Mitigations
| Risk | Example | Mitigation |
| --- | --- | --- |
| Hidden cross-feature coupling | Shared hooks importing tournament logic | Split hook into `shared` base + feature adapter. |
| Circular dependencies during move | Moving provider + consumer together | Move providers first, then update consumers. |
| Regressions from large moves | Multi-folder refactor in one commit | Move in small batches; keep app building each phase. |
| Type leakage | Feature types in shared modules | Create `shared/types` for common contracts; keep domain types in features. |

## Step-by-Step Migration Plan (Avoid Circular Dependencies)

### Phase 0: Preparation
1. Confirm TypeScript path aliases support the new top-level folders (`@/app`, `@/features`, `@/shared`) while keeping the `@/` root alias.
2. Inventory global modules that import from `features/` and plan splits (base generic hook in `shared/`, feature wrapper in `features/`).
3. Add temporary `index.ts` barrels (optional) in `shared/` and `features/` to ease import updates during migration.

### Phase 1: Create Target Folders
4. Create `src/app/`, `src/shared/`, and feature subfolders (`ui`, `hooks`, `services`, `types`, `store`).

### Phase 2: Shared Infrastructure First
5. Move infra services (e.g., Supabase client, sync queue) into `shared/services/`.
6. Update app entry points to import infra from `shared/services/`.
7. Move shared utilities/constants to `shared/lib/` and update imports.

### Phase 3: Split Hooks to Avoid Coupling
8. Move **generic** hooks into `shared/hooks/`.
9. For hooks that currently import feature code, split them:
   - base hook in `shared/hooks/`
   - feature adapter in `features/<feature>/hooks/`
10. Replace imports in feature code to use the new feature hooks instead of shared hooks that reached across boundaries.

### Phase 4: Feature Modules
11. Move feature services into `features/<feature>/services/`.
12. Move feature UI into `features/<feature>/ui/` and keep routes pointing to feature entry components.

### Phase 5: Shared UI
13. Move reusable layout/UI components into `shared/ui/`.
14. Keep app-specific composition components in `app/` if not reused across features.

### Phase 6: Store Modularization
15. Split the monolithic store into feature-level slices under `features/<feature>/store/` and compose in an `app/store/` entry.
16. Ensure feature stores only import `shared/` types and utilities (no cross-feature imports).
17. Move shared store utilities (e.g., helpers) into `shared/lib/` or `shared/types/`.

### Phase 7: Validate Dependency Direction
18. Enforce import rules:
   - `app` can import `features` and `shared`.
   - `features` can import `shared` only.
   - `shared` does not import `features` or `app`.
19. Run typecheck/build to surface circular references early.
20. Add an automated dependency check (lint rule or script) once the structure stabilizes.
21. Add import-boundary lint rules (e.g., ESLint boundaries) if available.

## Current Migration Checklist
- [x] Create the top-level `app`, `features`, and `shared` folders.
- [x] Add automated import-boundary enforcement (`pnpm run check:maintenance`).
- [ ] Move the remaining root-level `src/services/*` modules into `shared/` or feature-local service folders.
- [ ] Split `src/store/appStore.ts` into an app entry plus feature-level slices/modules.
- [x] Add explicit `@/app/*`, `@/features/*`, and `@/shared/*` alias entries in tooling.
- [ ] Keep validating each migration batch with lint/typecheck/build.

## Notes
- Migrate in small batches and keep the app building after each phase.
- Prefer moving code along existing dependency paths to avoid temporary circular imports.
- Avoid moving both a provider and its consumers in the same commit unless necessary; move providers first, then update consumers.
