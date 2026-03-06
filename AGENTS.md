# AGENTS.md

Operational guide for contributors and coding agents in this repository.

## Baseline

- Use `pnpm` (not `npm`) for all project scripts.
- Required versions:
  - `node >= 20.19.0`
  - `pnpm >= 10.26.0` (repo uses `10.27.0` in CI)
- Set environment variables from `.env.example` before running app or DB checks.

## Command Matrix

| Goal | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start frontend dev server | `pnpm run dev` or `pnpm run dev:client` |
| Start API server | `pnpm run dev:server` |
| Production build | `pnpm run build` |
| Preview production build | `pnpm run preview` |
| Full lint + type + architecture + artifact checks | `pnpm run lint` |
| Biome-only checks | `pnpm run lint:full` |
| TypeScript-only checks | `pnpm run lint:types` |
| Auto-fix lint issues | `pnpm run lint:fix` |
| Format code | `pnpm run format` |
| Run all tests | `pnpm run test` |
| Watch tests | `pnpm run test:watch` |
| Coverage report | `pnpm run test:coverage` |
| Full local quality gate | `pnpm run check` |
| Detect case-collision files | `pnpm run check:case-collisions` |
| Detect copy-artifact files (`file 2.ts`) | `pnpm run check:copy-artifacts` |
| Enforce import boundaries | `pnpm run check:arch` |
| Dependency usage check (Knip) | `pnpm run check:deps` |
| Auto-fix dependency findings | `pnpm run check:deps:fix` |
| Push Drizzle schema changes | `pnpm run db:push` |
| Clean build caches | `pnpm run clean` |

## Workflows

### 1. Standard Feature Workflow

1. `pnpm install`
2. Start required services:
   - frontend: `pnpm run dev:client`
   - backend (if needed): `pnpm run dev:server`
3. Implement in small increments.
4. Validate before commit:
   - `pnpm run lint`
   - `pnpm run build`
   - `pnpm run test`

### 2. UI/UX Workflow

1. Pre-flight checks:
   - `pnpm run lint:types`
   - `pnpm run lint`
2. Run app with `pnpm run dev`.
3. After UI updates:
   - `pnpm run lint:fix`
   - `pnpm run lint`
   - `pnpm run build`
4. Manual usability pass:
   - Select two names
   - Start tournament
   - Play through completion
   - Open results
   - Verify reordering behavior

### 3. Refactor Workflow

1. Move one module group at a time.
2. Immediately update all imports for moved files.
3. After each significant move:
   - `pnpm run lint`
   - `pnpm run lint:types`
4. Before merge, run:
   - `pnpm run check`
   - `pnpm run test`

### 4. DB/API Change Workflow

1. Update schema/queries.
2. Run `pnpm run db:push` (when schema changes are intended).
3. Validate API behavior with tests.
4. Run `pnpm run lint` and `pnpm run test` before PR.

### 5. PR Workflow

1. Ensure PR title follows conventional format:
   - example: `fix(auth): handle expired token`
2. Fill required PR template sections:
   - `## Summary`
   - `## Validation`
   - `## Rollout + Revert Plan`
3. Local PR gate:
   - `pnpm run lint`
   - `pnpm run build`
   - `pnpm run test`

## Hook and CI Parity

- Pre-commit hook runs:
  - `pnpm run check:arch`
  - `pnpm run check:copy-artifacts`
  - `pnpm run check:case-collisions`
  - Biome staged-file fixes
  - `pnpm run lint:types`
- CI runs:
  - `pnpm run lint`
  - `pnpm run build`
  - `pnpm run test`

## Reference Docs

- `README.md`
- `docs/CONTRIBUTING.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `.dev/workflows/ui-ux.md`
- `.dev/workflows/refactoring-plan.md`
