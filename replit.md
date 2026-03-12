# Name Nosferatu

A React application for managing cat names with tournament-style voting, built with Vite and Supabase.

## Overview
- **Purpose**: Cat name management and tournament voting application
- **Stack**: React 19, Vite 7, TypeScript, Tailwind CSS, Supabase
- **State Management**: Zustand, React Query

## Project Structure
```
src/
  App.tsx         - Main application component
  main.tsx        - Entry point
  core/           - Core hooks and utilities
  features/       - Feature-specific components
  shared/         - Shared components, services, utils, styles
  types/          - TypeScript type definitions
  integrations/   - Third-party integrations (Supabase)
config/           - Build and linting configurations
public/           - Static assets
```

## Development

### Running the App
```bash
npm run dev          # Start development server on port 5000
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

### Environment Variables
Required Supabase credentials:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Deployment
- Deployment target: Static
- Build command: `npm run build`
- Output directory: `dist`

## Overview

Name Nosferatu is a tournament-style web application for ranking cat names through pairwise comparison using an Elo rating system. Users select cat name candidates, compete them in bracket-style tournaments, and view analytics on name popularity and rankings. The app features user authentication, admin controls for managing names, real-time analytics dashboards, and a suggestion system for new names.

The application runs as a full-stack project: a Vite-powered React frontend on port 5000, and an Express backend API server on port 3001. Data is stored in PostgreSQL via Supabase, with Drizzle ORM for server-side database operations and the Supabase JS client for frontend queries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 19 with TypeScript, built with Vite
- **Routing**: React Router DOM v6 with lazy-loaded route components for code splitting
- **State Management**: Zustand for client-side app state (`src/store/appStore.ts`), TanStack Query for server state caching
- **Styling**: Tailwind CSS v4 with PostCSS, plus CVA (Class Variance Authority) for component variants. Design tokens defined in CSS custom properties (`src/shared/styles/design-tokens.css`). HeroUI component library is integrated.
- **Animations**: Framer Motion for UI transitions and micro-interactions
- **Forms**: Custom form hooks with Zod validation (see `src/hooks/useNames.ts`)
- **Entry Point**: `src/app/main.tsx` → wraps App in QueryClientProvider, BrowserRouter, and custom Providers (auth)

### Project Structure (Feature-Based)

The codebase follows a feature-based architecture with one-way dependency flow: `app → features → shared`.

```
src/
  app/           - Main App component, routes, providers, config
  features/
    tournament/  - Tournament gameplay (modes, hooks, components, services)
    analytics/   - Analytics dashboard and data visualization
    admin/       - Admin dashboard and management tools
  shared/
    components/  - Reusable UI components (layout, cards, forms, errors)
    hooks/       - Generic hooks (useLocalStorage, useOfflineSync, etc.)
    lib/         - Utilities (icons, basic helpers, performance monitoring)
    services/    - Supabase client, API client, error manager
    types/       - Shared TypeScript types (NameItem, etc.)
    styles/      - Design tokens and global styles
  hooks/         - Domain-specific hooks (useNames, useMasonryLayout)
  store/         - Zustand store (appStore.ts)
  services/      - Auth adapter, analytics service, error manager
  navConfig.ts   - Navigation structure configuration
  routes.tsx     - Route definitions with lazy loading
```

### Backend Architecture

- **Runtime**: Express.js server (`server/index.ts`) running on port 3001
- **Database**: PostgreSQL via Supabase, accessed through Drizzle ORM (`server/db.ts`)
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions — tables include `cat_app_users`, `cat_name_options`, `cat_name_ratings`, `cat_tournament_selections`, `user_roles`
- **API Routes**: RESTful endpoints in `server/routes.ts` — CRUD for names, users, ratings, tournaments, analytics, with admin-protected routes
- **Validation**: Zod schemas in `server/validation.ts` for input validation
- **Auth**: Admin endpoints protected by `requireAdmin` middleware using timing-safe API key comparison (`server/auth.ts`)
- **Mock Mode**: When `DATABASE_URL` is not set, the server falls back to mock data, allowing development without a database

### Key Design Decisions

1. **Dual database access pattern**: The frontend uses the Supabase JS client directly for reads and real-time features, while the backend Express server uses Drizzle ORM for writes and admin operations. This gives the frontend fast reads via Supabase's REST API while keeping mutations validated server-side.

2. **Feature-based code organization**: Code is grouped by domain feature (tournament, analytics, admin) rather than by technical layer. Shared utilities live in `src/shared/`. This reduces coupling and improves discoverability.

3. **Lazy loading**: Route components are lazy-loaded via `React.lazy()` and `Suspense` to reduce initial bundle size. Tournament, Analytics, and Admin dashboards load on demand.

4. **Progressive Web App**: Includes a service worker (`public/sw.js`) with cache-first strategy for static assets and network-first for HTML. Has a `manifest.json` for installability.

5. **Offline resilience**: The app includes offline sync capabilities (`useOfflineSync` hook) and the server gracefully degrades to mock mode without a database.

### Testing

- **Framework**: Vitest with jsdom environment for frontend, node environment for backend
- **Frontend tests**: React Testing Library, co-located with components
- **Backend tests**: Supertest for API route testing, with both mock-mode and database-mode test suites
- **Coverage**: V8 provider, reports in text/json/html formats
- **Run**: `pnpm test` for all tests, `pnpm run test:coverage` for coverage

### Code Quality

- **Linter**: Biome (replaces ESLint + Prettier) — configured in `biome.json` with tab indentation, 100 char line width
- **CSS Linting**: Stylelint with standard config (`.stylelintrc.json`)
- **Type Checking**: Strict TypeScript config with `noImplicitAny`, `strictNullChecks`, etc.
- **Dependency Checking**: Knip for detecting unused dependencies
- **Architecture Checks**: Custom shell scripts for case collisions, copy artifacts, and architecture boundary enforcement

## External Dependencies

### Core Services

- **Supabase** (PostgreSQL + Auth): Primary database and authentication provider. URL: `ocghxwwwuubgmwsxgyoy.supabase.co`. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL`
- **Vercel**: Deployment platform (configured in `vercel.json`), builds from `main` branch only
- **Vercel Analytics**: Client-side analytics via `@vercel/analytics/react`

### Key NPM Dependencies

- `react` / `react-dom` (v19) — UI framework
- `react-router-dom` (v6) — Client-side routing
- `@tanstack/react-query` — Server state management
- `zustand` — Client state management
- `@supabase/supabase-js` — Supabase client SDK
- `drizzle-orm` / `drizzle-kit` — Server-side ORM for PostgreSQL
- `express` / `cors` — Backend API server
- `zod` — Schema validation (shared between client and server)
- `framer-motion` — Animations
- `@heroui/react` — UI component library
- `@tailwindcss/vite` / `@tailwindcss/postcss` — Tailwind CSS v4 integration
- `dotenv` — Environment variable loading
- `tsx` — TypeScript execution for the dev server

### Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (frontend) |
| `DATABASE_URL` | PostgreSQL connection string (backend/Drizzle) |
| `ADMIN_API_KEY` | Secret key for admin API authentication |
| `CORS_ORIGIN` | Allowed CORS origin (defaults to localhost) |

### Dev Server Configuration

- Frontend: Vite dev server on port **5000** with HMR and polling-based file watching
- Backend: Express server on port **3001**, proxied from Vite via `/api` prefix
- Start both with: `pnpm dev`