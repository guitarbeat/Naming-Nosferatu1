# Architecture & System Design

**Last Updated:** January 30, 2026

> For visual design guidance and design tokens, see [DESIGN.md](./DESIGN.md).

## System Overview

**Name Nosferatu** is a tournament platform for ranking cat names through pairwise comparison using an Elo rating system.

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 with TypeScript |
| **Build** | Vite |
| **State** | Zustand (client) + TanStack Query (server) |
| **Styling** | Tailwind CSS v4 + CVA |
| **Backend** | Supabase (PostgreSQL, Auth) |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |

---

## Core Domain

### Name Lifecycle

```
candidate → tournament → (eliminated | archived)
```

Names are created, compete in tournaments via pairwise comparison, and are either eliminated or archived as winners.

### Key Entities

**NameItem** - A cat name with metadata:
- `id`, `name`, `description`
- `avgRating`, `wins`, `losses`
- `isHidden`, `isSelected`

**TournamentState** - Active tournament session:
- `names` - Competing names
- `ratings` - Elo ratings per name
- `voteHistory` - Match results
- `isComplete` - Tournament finished

**UserState** - Current user:
- `name`, `isLoggedIn`, `isAdmin`
- `preferences` - Theme, notifications

### Elo Rating System

Standard Elo with K-factor of 32 (64 for new players):

```typescript
getExpectedScore(ra, rb) = 1 / (1 + 10 ** ((rb - ra) / 400))
updateRating(r, expected, actual, games) = r + k * (actual - expected)
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `cat_app_users` | User profiles and preferences |
| `cat_user_roles` | RBAC permissions |
| `cat_name_options` | Available names with ratings |
| `cat_name_ratings` | Per-user name ratings |
| `cat_tournament_selections` | Tournament history |
| `site_settings` | Global configuration |

---

## Project Structure

```
src/
├── app/                  # App entry, providers, deployment/config
├── features/             # Domain features (admin, analytics, tournament)
├── hooks/                # Reusable React hooks
├── services/             # API, integration orchestration, supabase runtime
├── shared/               # Shared UI, hooks, libs, types, service re-exports
├── store/                # Zustand store slices and actions
├── styles/               # CSS layers and visual effects
├── types/                # App-level type definitions
└── routes.tsx            # Route definitions

supabase/                 # Database
├── migrations/           # SQL migrations
└── types.ts              # Generated types

server/                   # Express API, auth, validation, DB wiring
shared/                   # Cross-runtime schema shared by server and app

docs/                     # Documentation
config/                   # Tool configuration
```

### Directory Roles

| Directory | Purpose |
|-----------|---------|
| `shared/components/layout/` | Design system + layout primitives (Button, Card, Feedback, AppLayout, Lightbox) |
| `features/tournament/` | Tournament logic, name management, profiles, Elo ratings |
| `features/analytics/` | Analysis dashboard, charts, leaderboards |
| `features/admin/` | Administrative dashboards and controls |
| `hooks/` | Shared React hooks for browser state, forms, data fetching |
| `services/` | API clients, error handling, offline sync |
| `store/appStore.ts` | Global state management with Zustand |
| `types/appTypes.ts` | App type definitions |
| `shared/lib/` | Pure utilities, constants, cache, metrics, formatting |

---

## Component Architecture

### Component Locations

| Category | Location |
|----------|----------|
| **UI Primitives** | `src/shared/components/layout/` |
| **Layout** | `src/shared/components/layout/` |
| **Tournament** | `src/features/tournament/` |
| **Analytics** | `src/features/analytics/` |
| **Admin** | `src/features/admin/` |

### Key Components

#### UI Primitives (`shared/components/layout/`)

| Component | Description |
|-----------|-------------|
| `Button` | Primary button with CVA variants |
| `Card` | Container component with variants |
| `Error` | Error boundary with fallback UI |
| `FormPrimitives` | Input, Select, Label components |
| `LiquidGlass` | Glassmorphism effect |
| `StatusIndicators` | Loading spinners, badges |
| `Toast` | Notification system |
| `Charts` | Data visualization components |

#### Layout Components (`shared/components/layout/`)

| Component | Description |
|-----------|-------------|
| `AppLayout` | Main app shell and structure |
| `AdaptiveNav` | Responsive navigation (mobile/desktop) |
| `CollapsibleHeader` | Collapsible section headers |
| `CatBackground` | Animated cat background |
| `FloatingBubbles` | User bubble animations |

#### Feature Components

| Feature | Key Components |
|---------|----------------|
| **Tournament** | `Tournament` (setup/mode/flow), `SwipeableCards`, `RankingAdjustment`, `NameGrid`, `NameManagementView` |
| **Analytics** | `Dashboard` and analytics components/services |
| **Admin** | `AdminDashboard` |

---

## State Management

### Zustand Store

State is managed in `src/store/appStore.ts` with typed slices and actions:

| Slice | Purpose |
|-------|---------|
| `tournament` | Tournament state, names, ratings, vote history |
| `user` | User session, preferences, admin status |
| `ui` | Theme, matrix mode, cat pictures toggle |
| `siteSettings` | Global site configuration |
| `errors` | Error handling and history |

Key exports from `src/store/appStore.ts`:
- `useAppStore` - Main store hook (default export)
- store actions and selectors used by feature hooks/components

### Data Flow

```
User Action → Component → Zustand Store ←→ TanStack Query → Supabase
                              ↓
                         UI Update
```

---

## Service Layer

Services are located in `src/services/`:

| Service | Purpose |
|---------|---------|
| `errorManager.ts` | Centralized error handling with retry logic |
| `SyncQueue.ts` | Offline-first queue for failed operations |
| `supabase/client.ts` | Re-exports runtime/api modules |
| `supabase/runtime.ts` | Supabase runtime and wrappers (`withSupabase`) |
| `supabase/api.ts` | Domain APIs (`coreAPI`, `hiddenNamesAPI`, `imagesAPI`, `siteSettingsAPI`) |
| `apiClient.ts` | Shared HTTP client utilities |

All Supabase calls use `withSupabase()` for consistent error handling and offline support.

The Supabase integration is split across:
- `src/integrations/supabase/client.ts` for the generated client
- `src/services/supabase/runtime.ts` for execution wrappers and runtime behavior
- `src/services/supabase/api.ts` for domain-specific operations

---

## Key Patterns

1. **Feature-First Organization** - Domain behavior organized under `src/features/`
2. **CVA Variants** - Component variants via Class Variance Authority
3. **Error Boundaries** - Graceful error handling at feature boundaries
4. **Lazy Loading** - Dynamic imports for heavy components (Dashboard, Tournament)
5. **Path Aliases** - `@/features/*`, `@/shared/*`, `@/services/*` for clean imports
6. **Layered Modules** - Shared utilities/components separated from domain features:
   - `src/store/appStore.ts` - Global Zustand state
   - `src/types/appTypes.ts` + `src/shared/types/` - Type definitions
   - `src/shared/components/layout/` - reusable UI and layout primitives
   - `src/services/supabase/*` + `src/integrations/supabase/*` - runtime + generated client split
