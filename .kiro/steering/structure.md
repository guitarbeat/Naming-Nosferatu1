# Project Structure

## Directory Organization

```
src/
├── app/                  # App entry, providers, deployment/config
├── features/             # Domain features (admin, analytics, tournament)
├── hooks/                # Reusable React hooks
├── services/             # API clients, Supabase integration, error handling
├── shared/               # Shared UI, hooks, libs, types, service re-exports
├── store/                # Zustand store slices and actions
├── styles/               # CSS layers and visual effects
└── types/                # App-level type definitions

server/                   # Express API, auth, validation, DB wiring
shared/                   # Cross-runtime schema (server + app)
supabase/                 # Database migrations and generated types
docs/                     # Documentation
scripts/                  # Build scripts and utilities
public/                   # Static assets
```

## Key Directories

### `src/app/`
Application entry point, providers, and configuration.
- `main.tsx` - Entry point, imports `../index.css`
- `App.tsx` - Root component
- `appConfig.ts` - App configuration
- `providers/` - Context providers wrapper

### `src/features/`
Feature-first organization. Each feature is self-contained.
- `admin/` - Admin dashboard and controls
- `analytics/` - Analytics dashboard, charts, leaderboards
- `tournament/` - Tournament logic, name management, Elo ratings

### `src/shared/components/layout/`
Design system and reusable UI primitives.
- **UI Primitives**: Button, Card, ErrorBoundary, FormPrimitives, Loading
- **Layout**: AppLayout, FloatingNavbar, CollapsibleContent, Lightbox
- **Effects**: LiquidGlass (glassmorphism with SVG displacement)

### `src/services/`
API clients and integration orchestration.
- `errorManager.ts` - Centralized error handling with retry logic
- `apiClient.ts` - Shared HTTP client utilities
- `supabase/client.ts` - Re-exports runtime/api modules
- `supabase/runtime.ts` - Supabase runtime and wrappers (`withSupabase`)
- `supabase/api.ts` - Domain APIs (coreAPI, hiddenNamesAPI, imagesAPI, statsAPI)

### `src/store/`
Zustand state management.
- `appStore.ts` - Main store with typed slices (tournament, user, ui, siteSettings, errors)

### `src/styles/`
Global CSS organized by responsibility.
- `index.css` - Entry point for all styles
- `base.css` - Tailwind directives
- `tokens.css` - Design tokens and theme variables
- `reset.css` - Reset and base element defaults
- `typography.css` - Typography utilities
- `layout.css` - Layout primitives and responsive behavior
- `components.css` - Shared component classes
- `motion.css` - Keyframes and transitions
- `liquid-glass.css` - Liquid glass visual system

### `server/`
Express backend with API routes, auth, and validation.
- `index.ts` - Server entry point
- `routes.ts` - API route definitions
- `auth.ts` - Authentication logic
- `validation.ts` - Request validation with Zod
- `db.ts` - Database connection and Drizzle setup

### `shared/`
Cross-runtime schema shared between server and app.
- `schema.ts` - Zod schemas used by both client and server

## Import Patterns

### Path Aliases
Use `@/` prefix for clean imports:
```typescript
import { Button } from '@/shared/components/layout/Button';
import { useAppStore } from '@/store/appStore';
import { coreAPI } from '@/services/supabase/api';
```

### Feature Imports
Features should be self-contained. Import from feature root:
```typescript
import { Tournament } from '@/features/tournament/Tournament';
import { Dashboard } from '@/features/analytics/Dashboard';
```

### Service Layer
All Supabase calls use `withSupabase()` for consistent error handling:
```typescript
import { withSupabase } from '@/services/supabase/runtime';
import { coreAPI } from '@/services/supabase/api';
```

## Architecture Boundaries

The project enforces import boundaries via `check:arch` script:
- Features should not import from other features
- Shared code should not import from features
- Services layer is independent of features

## File Naming Conventions

- **Components**: PascalCase (e.g., `Button.tsx`, `TournamentFlow.tsx`)
- **Utilities**: camelCase (e.g., `errorManager.ts`, `apiClient.ts`)
- **Types**: PascalCase for interfaces/types (e.g., `NameItem`, `TournamentState`)
- **Tests**: Same name as file with `.test.ts(x)` suffix (e.g., `Button.test.tsx`)
- **CSS**: kebab-case (e.g., `liquid-glass.css`, `fancy-button.css`)

## CSS Import Chain

```
src/app/main.tsx
  → src/index.css
    → src/styles/index.css
      → @import "tailwindcss"
      → @import "./base.css"
      → @import "./tokens.css"
      → @import "./reset.css"
      → @import "./typography.css"
      → @import "./layout.css"
      → @import "./components.css"
      → @import "./motion.css"
      → @import "./liquid-glass.css"
```

Component-specific CSS is co-located and imported directly in the component file.

## Testing Structure

Tests are co-located with the code they test:
- `src/app/App.test.tsx` - Tests for App component
- `server/routes.test.ts` - Mock mode API tests
- `server/routes.db.test.ts` - Database mode API tests

## Documentation

- `docs/ARCHITECTURE.md` - System design and component architecture
- `docs/DESIGN.md` - Design system, tokens, and UI/UX guidelines
- `docs/API.md` - API endpoints and database schema
- `docs/TESTING.md` - Testing strategy and approach
- `docs/CONTRIBUTING.md` - Setup and coding standards
