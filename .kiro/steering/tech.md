# Tech Stack

## Core Technologies

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Class Variance Authority (CVA), Framer Motion
- **State**: Zustand (client state) + TanStack Query (server state)
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest, React Testing Library, Supertest, fast-check (property-based testing)
- **Tooling**: Biome (linting/formatting), pnpm

## Package Manager

Use **pnpm** exclusively (>= 10.26.0). Node >= 20.19.0 required.

## Common Commands

### Development
```bash
pnpm dev              # Start dev server (client + server)
pnpm dev:client       # Vite frontend only (port 5173)
pnpm dev:server       # Express backend only (port 3001)
```

### Testing
```bash
pnpm test             # Run all tests once
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report
```

### Code Quality
```bash
pnpm lint             # Run all checks (case collisions, copy artifacts, arch boundaries, biome, types)
pnpm fix              # Auto-fix linting issues
pnpm format           # Format code with Biome
pnpm check:deps       # Check for unused dependencies (Knip)
```

### Database
```bash
pnpm db:push          # Push schema changes to database
```

### Build
```bash
pnpm build            # Production build
pnpm build:dev        # Development build
pnpm preview          # Preview production build
```

## Code Quality Tools

### Biome Configuration
- **Formatter**: Tab indentation, 100 character line width, double quotes
- **Linter**: Strict rules with recommended presets
- **Test files**: Relaxed rules for `noExplicitAny` and naming conventions
- **Auto-organize imports**: Enabled via assist actions

### Architecture Guards
- `check:case-collisions` - Detects case-sensitive filename issues
- `check:copy-artifacts` - Detects accidental "file 2.ts" copies
- `check:arch` - Enforces import boundaries between layers

## Build Configuration

### Vite
- Dev server: `localhost:5173`
- API proxy: `/api` → `http://localhost:3001`
- Path alias: `@/` → `src/`
- Plugins: React, Tailwind CSS v4, console forwarding

### TypeScript
- Strict mode enabled
- Path aliases configured for clean imports

## Key Libraries

- **UI**: @heroui/react, lucide-react
- **DnD**: @hello-pangea/dnd
- **Routing**: react-router-dom v7
- **Forms**: React Hook Form + Zod validation
- **HTTP**: express, cors, express-rate-limit
- **Auth**: jsonwebtoken
- **Analytics**: @vercel/analytics
