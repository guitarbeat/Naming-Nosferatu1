# Contributing Guide

**Last Updated:** February 19, 2026
**Status:** Primary Reference for Developers

This document provides a comprehensive guide for setting up, developing, maintaining, and optimizing the Naming Nosferatu application.

---

## 📋 Recent Updates (January 2026)

### Code Quality Improvements

- **Fixed Critical Bug**: Unhandled promise rejection in `src/hooks/useUserSession.ts`
  - Added `.catch()` handler to prevent "An unexpected error occurred" global error message
  - Added fallback login mechanism for import failures
- **Modernized Routing**: Migrated from custom `useRouting` to React Router DOM v6
  - Improved navigation patterns and URL synchronization
  - Added Router context safety checks
- **Component Consolidation**: Unified 4 navigation components into single `AdaptiveNav`
- **CVA Implementation**: Adopted Class Variance Authority for component variants
- **Removed Unused Dependencies**: `sharp`, `lovable-tagger` (kept `react-router-dom` as actively used)
- **Code Quality Report**: Comprehensive post-consolidation assessment (See `docs/archive/specs/css-dry-refactor/analysis/css-analysis-report.md`)

### How to Avoid Similar Issues

1. Always add `.catch()` handlers to promise chains
2. Test `pnpm run check:deps` before committing
3. Avoid dynamic imports without error handling
4. Use `.then().catch()` not `.then().then()` for error handling

---

## 🚀 Quick Start

### 📦 Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0
- **Supabase CLI**: (Optional, for local development)

### 🛠️ Commands

| Command          | Description                                |
| ---------------- | ------------------------------------------ |
| `pnpm run dev`   | Start Vite dev server with HMR             |
| `pnpm run build` | Production build                           |
| `pnpm run lint`  | Run Biome linter and TypeScript checks     |
| `pnpm run fix`   | Auto-fix linting issues                    |
| `pnpm run check` | Run all checks (lint, types, limits, deps) |
| `pnpm run check:copy-artifacts` | Detect accidental `file 2.ts` / `file 3.ts` copies |
| `pnpm run check:arch` | Enforce architecture import boundaries |

---

## 📦 Dependency Management & Optimization

### Current Bundle Status

- **Bundle Size**: 730KB total (421KB CSS + 309KB JS, optimized)
- **Status**: ✅ Within performance budgets
- **Optimization**: Route-based code splitting, lazy loading, tree-shaking
- **Target**: Maintain <500KB total for fast loading

### Production Dependencies Analysis

#### ✅ Core Dependencies (Keep)

- **React 19.2.3** - Framework core
- **@supabase/supabase-js 2.90.0** - Backend
- **@tanstack/react-query 5.62.7** - Server state
- **zustand 5.0.2** - Client state management
- **react-router-dom 6.30.3** - Client-side routing
- **class-variance-authority 0.7.1** - Component variants
- **framer-motion 11.18.1** - Animations
- **zustand 5.0.9** - Client state
- **zod 4.3.5** - Schema validation
- **react-router-dom 6.21.3** - Routing
- **tailwindcss 4.1.18** - Styling

---

## 🏗️ Coding Standards

### 1. File Size Limits

To prevent "Mega-files," we enforce limits in `scripts/enforce-limits.js`:

- **Components (.tsx/.ts)**: Max **400 lines**.
- **CSS Modules (.css)**: Max **750 lines**.
- **Scripts (.js)**: Max **200 lines**.

_If you hit a limit: Extract sub-components or custom hooks._

### 2. Naming Conventions

We use **camelCase** for JS/TS identifiers, with specific exceptions:

#### ✅ Standard

- **Variables & Functions**: `camelCase`
- **Classes & Components**: `PascalCase`
- **Constants**: `UPPER_CASE`
- **TypeScript Types**: `PascalCase`

#### ⚠️ Exceptions (When to use snake_case)

- **Database Columns**: Must match PostgreSQL (`is_hidden`, `avg_rating`).
- **Supabase Generated Types**: Auto-generated fields.
- **API Contracts**: When external services require it.
- **CSS Classes**: Used for consistency in complex identifiers.

#### 🔇 Linting Suppressions

If you must use `snake_case` in a file:

```typescript
// biome-ignore lint/style/useNamingConvention: Database column names must match exactly
const { user_name } = user;
```

---

## 💎 Clean Code Principles

To maintain long-term maintainability, follow these principles:

- **Constants Over Magic Numbers**: Replace hard-coded values with named constants at the top of the file or in a dedicated constants file.
- **Meaningful Names**: Variables, functions, and classes should reveal their purpose (e.g., `isLoading`, `hasError`).
- **Smart Comments**: Make code self-documenting; use comments to explain _why_ something is done, not _what_ it does.
- **Single Responsibility**: Each function or component should do exactly one thing and be small/focused.
- **DRY (Don't Repeat Yourself)**: Extract repeated logic into reusable hooks or utilities.
- **Encapsulation**: Hide implementation details and expose clear, minimal interfaces.
- **Early Returns**: Use guard clauses to handle edge cases or errors early in functions.

---

## ⚛️ React & TypeScript Patterns

### TypeScript Standards

- **Interfaces over Types**: Prefer `interface` for object definitions and component props.
- **No Enums**: Use constant maps or literal unions for better tree-shaking and simplicity.
- **Direct Exports**: Favor named exports for components and utilities to improve IDE discoverability.

### Synthetic Components

- Use functional components with TypeScript interfaces.
- Keep components under 400 lines (see [File Size Limits](#1-file-size-limits)).
- Structure files logically: Exported component → Subcomponents → Helpers → Types.

### State Management

- **Zustand**: Use for UI state and cross-route client state.
- **TanStack Query**: Exclusive for server-side data fetching and synchronization.
- **Local State**: Use `useState` only for state that doesn't need to be shared.

### Performance & Optimization

- Use immutable data structures.
- Lazy load heavy features (e.g., charts, drag-and-drop) using `React.lazy`.
- Leverage efficient data structures (Maps/Sets) for frequent lookups.
- Avoid unnecessary effect dependencies to prevent re-render loops.

---

## ✍️ Copywriting & Tone

### Tone of Voice

- **Elite/Scientific**: We use terms like "Optimal pairings," "Analytics," "Elo Ratings."
- **Playful/Cat-Focused**: Keep it light, but precise.
- **Friendly**: Error messages should be helpful, not technical jargon.

### Writing Guidelines

- **Capitalization**: Use Sentence case for headings and buttons (e.g., "Start tournament").
- **Buttons**: Use action verbs (e.g., "Vote," "Skip," "Export CSV").
- **Dates**: Use relative dates ("2 days ago") for recent events, absolute ("Jan 15, 2026") for history.
- **Placeholders**: Use `{variableName}` format consistently.

---

## 🔄 Development Workflow

### 1. Iterative Development

Working with AI agents works best in small, verifiable cycles:

1. **Plan**: Define the specific component or fix.
2. **Build**: Create the file or logic.
3. **Verify**: Run `pnpm run check` to ensure no lint/type/size violations.
4. **Iterate**: Polish and move to the next feature.

### 2. PR Checklist

- [ ] Code follows naming conventions.
- [ ] File size limits are not exceeded.
- [ ] `pnpm run check` passes with zero errors.
- [ ] Documentation (if applicable) is updated in `docs/`.

### 3. Administrative Operating Model (February 19, 2026)

To reduce cycle time and merge friction, use these process rules:

- **Issue intake is structured**: Open bugs/features through GitHub issue forms to capture severity, acceptance criteria, and reproducible steps.
- **PRs must include rollout/revert**: Every pull request uses the repository PR template and includes validation and rollback notes.
- **Ownership is explicit**: `CODEOWNERS` controls review routing for frontend, backend, DB, tooling, and docs changes.
- **PRs are auto-labeled**: Labels are applied from file paths (`frontend`, `backend`, `database`, `ci-cd`, `docs`) to speed triage and batching.
- **PR titles are enforced**: Pull requests must follow conventional format like `fix(auth): handle token refresh`.
- **PR size is visible by label**: Automatic `size/xs` ... `size/xl` labels improve batching and review planning.
- **Dependency hygiene is scheduled**: Dependabot runs weekly for npm and GitHub Actions with grouped update categories to reduce PR noise.
- **Stale work is surfaced and closed**: Inactive issues/PRs are marked stale and closed on a schedule unless exempt labels are present.
- **Merge order for stacked work**: Merge in this order to minimize conflict churn: `infra/tooling` -> `database` -> `backend` -> `frontend` -> `docs`.
- **Jules for branch-heavy cloud work**: For large branch stacks or conflict-heavy rebases, use Jules to perform cloud agentic updates, then finalize merges with GitHub controls.

Recommended daily cadence:

1. Triage new issues and PRs once per day.
2. Merge low-risk green PRs in small batches.
3. Resolve conflicts in active stacks before opening new feature branches.
4. Keep `main` releasable at all times.

---

## 🗑️ Dead Code Prevention

Use these tools to keep the codebase clean:

- **`pnpm run check:deps`** - Catch unused dependencies and exports via knip
- **`pnpm run lint`** - Biome linting catches unused variables
- Review `// ts-prune-ignore-next` comments periodically

---

## 📂 Directory Structure

```
src/
├── app/                # App entry, providers, deployment/config
├── features/           # Domain features (admin, analytics, tournament)
├── hooks/              # Reusable React hooks
├── services/           # API and Supabase runtime/api wrappers
├── shared/             # Shared components, hooks, utils, types
├── store/              # Zustand app store
├── styles/             # CSS layers/tokens/effects
├── types/              # App-level types
└── routes.tsx          # Route definitions

server/                 # Express API routes/auth/validation
shared/                 # Cross-runtime shared schema
supabase/               # DB migrations and generated DB types
docs/                   # Project documentation
```
