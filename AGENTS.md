# AGENTS.md

Operational guide for coding agents working in `Naming-Nosferatu`.

If this file conflicts with older notes in `README.md` or `docs/CONTRIBUTING.md`, trust `package.json`, `config/`, and `.github/workflows/` first.

## Stack and layout

- Frontend: React 19 + TypeScript + Vite in `src/`
- Shared frontend services and data helpers: `src/shared/` and `shared/`
- Database migrations/functions: `supabase/`
- Tool config: `config/`

Important directory split:

- `src/shared/` is frontend shared UI/hooks/lib/services/types.
- `shared/` is root-level shared data/runtime code used outside the feature folders.

Primary feature areas:

- `src/features/tournament/`
- `src/features/analytics/`
- `src/features/admin/`
- `src/features/websocket/`

Canonical TS path aliases come from `config/tsconfig.json`:

- `@/*`
- `@/app/*`
- `@/features/*`
- `@/shared/*`
- `@/services/*`

## Environment

- Node: `20.19.6`
- pnpm: `10.27.0`
- Install deps with `pnpm install`

Environment variables:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) enable Supabase-backed frontend work
- `VITE_SENTRY_DSN` enables production Sentry reporting
- There is currently no tracked `config/.env.example`, so inspect code paths before assuming a sample env file exists

## Commands

### Development

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Vite dev server using `config/vite.config.ts` |
| `pnpm run dev:client` | Alias of `pnpm dev`; also uses `config/vite.config.ts` |
| `pnpm run build` | Production build with `config/vite.config.ts` |
| `pnpm run build:dev` | Development-mode build with `config/vite.config.ts` |
| `pnpm run preview` | Preview the built app with `config/vite.config.ts` |

### Quality

| Command | What it does |
| --- | --- |
| `pnpm run lint` | Runs maintenance checks, Biome checks, and TypeScript checks |
| `pnpm run lint:full` | `biome check --config-path config/biome.json src shared` |
| `pnpm run lint:types` | `tsc --project config/tsconfig.json --noEmit` |
| `pnpm run lint:fix` | Biome autofix for `src` and `shared` |
| `pnpm run format` | Biome format for `src` and `shared` |
| `pnpm run fix` | Alias for `pnpm run lint:fix` |
| `pnpm run check` | Full repo gate: `lint` plus `check:deps` |
| `pnpm run check:deps` | Runs Knip using `config/knip.json` |
| `pnpm run check:deps:fix` | Runs Knip autofix |
| `pnpm run clean` | Removes `build`, `dist`, and Vite cache artifacts |

### Testing and DB

| Command | What it does |
| --- | --- |
| `pnpm test` | Runs Vitest once with `config/vitest.config.ts` |
| `pnpm run test:watch` | Runs Vitest in watch mode |
| `pnpm run test:coverage` | Runs coverage with V8 reporter |

### Maintenance subchecks

`pnpm run check:maintenance` runs all maintenance checks:

- `case-collisions`
- `copy-artifacts`
- `env`
- `arch`
- `cycles`

Run a single maintenance check by passing the flag directly to the script, for example:

- `pnpm run check:maintenance --arch`
- `pnpm run check:maintenance --cycles`
- `pnpm run check:maintenance --env`

Do not use `pnpm run check:maintenance -- --arch`; this script expects the flag directly.

## Working workflow

Default change loop:

1. Use `pnpm dev` for local frontend work.
2. Make the smallest focused change possible in the relevant layer.
3. Run targeted tests when practical, then run `pnpm run lint`.
4. Before handoff or PR, run `pnpm run build`.
5. If exports, files, or dependencies moved, run `pnpm run check`.

When to use which dev flow:

- `pnpm dev` and `pnpm run dev:client` are equivalent today.
- Prefer the shared Supabase barrel at `src/shared/services/supabase/index.ts` instead of importing `api.ts` and `runtime.ts` separately unless you are editing those internals.

## Architecture rules

- Dependency flow is one-way: app/features depend on shared layers, not the reverse.
- `src/shared/` and `src/services/` must not import from `@/features/*`.
- Keep feature-specific code inside its feature folder.
- Keep shared UI primitives under `src/shared/components/layout/`.
- Keep cross-runtime schema and shared data in root `shared/`.

The architecture boundary and circular dependency checks are enforced by:

- `scripts/check-architecture-boundaries.mjs`
- `scripts/check-circular-dependencies.ts`

## Testing notes

- Frontend tests live beside the code as `*.test.ts` or `*.test.tsx`.
- Canonical Vitest config is `config/vitest.config.ts`.
- Common focused run pattern: `pnpm exec vitest --run --config config/vitest.config.ts path/to/file.test.tsx`

## Git and PR workflows

Pre-commit hooks come from `config/lefthook.yml` and currently run:

- `pnpm run check:maintenance`
- Biome `check --write` on staged JS/TS/CSS files
- `pnpm run lint:types`

GitHub workflows currently enforce:

- `CI`: `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run build`, `pnpm run test`
- `PR Hygiene`: PR body must include `## Summary`, `## Validation`, and `## Rollout + Revert Plan`
- `PR Labeler`: labels PRs from file paths
- `PR Size Labeler`: applies `size/xs` through `size/xl`
- `PR Title Lint`: semantic PR titles such as `fix(auth): handle token refresh`
- `Auto-merge Dependabot PRs`: auto-merges non-major Dependabot PRs after checks
- `Stale Triage`: marks and closes inactive issues/PRs on schedule

Relevant repo process files:

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/CODEOWNERS`
- `.github/labeler.yml`
- `.github/dependabot.yml`

## Config entry points

Prefer the config files in `config/` for tooling work:

- `config/vite.config.ts`
- `config/vitest.config.ts`
- `config/tsconfig.json`
- `config/biome.json`
- `config/knip.json`
- `config/lefthook.yml`

Exception:

- `vite.config.ts` at the repo root is a compatibility wrapper. Treat `config/vite.config.ts` as the single source of truth.

## Documentation upkeep

If you change scripts, hooks, CI, environment requirements, or agent workflow expectations, update this file in the same change.
