# Project Guidelines

This document provides essential information for advanced developers working on the **Name Nosferatu** project.

## 🛠 Build & Configuration

The project follows a modular configuration approach, with all configuration files centralized in the `config/` directory.

### Environment Setup
1. **Node.js**: Ensure you are using version `>= 20.19.0`.
2. **pnpm**: Ensure you are using version `>= 10.26.0`.
3. **Dependencies**: Run `pnpm install` to install all required packages.
4. **Environment Variables**:
   - Copy `config/.env.example` to `.env` in the root.
   - Required variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL` (PostgreSQL), and `JWT_SECRET`.

### Development Servers
- **Full Stack**: `pnpm dev` (starts both frontend and backend concurrently).
- **Backend Only**: `pnpm run dev:server` (starts Express server on port 3001).
- **Frontend Only**: `pnpm run dev:client` (starts Vite on port 5000).

## 🧪 Testing

We use **Vitest** for testing, **React Testing Library** for frontend, and **Supertest** for backend routes.

### Configuration
Testing configuration is located in `config/vitest.config.ts` and `config/vitest.setup.ts`.

### Running Tests
- **All Tests**: `pnpm test`
- **Watch Mode**: `pnpm run test:watch`
- **Coverage**: `pnpm run test:coverage`
- **Specific File**: `pnpm vitest --config config/vitest.config.ts <path_to_test>`

### Adding New Tests
Tests should be placed alongside the code they test (e.g., `src/features/featureName/Component.test.tsx` or `server/routes.test.ts`).

#### Example: Validation Test
To test server-side Zod validation:
```typescript
import { describe, it, expect } from 'vitest';
import { createNameSchema } from '../server/validation';

describe('createNameSchema', () => {
  it('should validate a correct name', () => {
    const result = createNameSchema.safeParse({ name: 'Fluffy' });
    expect(result.success).toBe(true);
  });

  it('should fail on invalid characters', () => {
    const result = createNameSchema.safeParse({ name: 'Fluffy123' });
    expect(result.success).toBe(false);
  });
});
```

## 🏗 Development Standards

### Architecture
- **Frontend**: React 19, Tailwind CSS v4, Zustand (UI state), TanStack Query (server state).
- **Backend**: Node.js Express, Drizzle ORM, Supabase.
- **Directory Structure**:
  - `src/features/`: Domain-specific logic and components.
  - `src/shared/`: Reusable components, hooks, and utilities.
  - `server/`: Backend API and database integration.
  - `shared/`: Code shared between frontend and backend (e.g., Zod schemas).

### Code Quality
- **Linting**: We use **Biome**. Run `pnpm run lint` or `pnpm run fix`.
- **Maintenance**: `pnpm run check:maintenance` runs critical architectural and consistency checks.
- **File Limits**:
  - Components: Max 400 lines.
  - Scripts: Max 200 lines.
  - CSS Modules: Max 750 lines.

### Naming Conventions
- **camelCase** for JS/TS identifiers.
- **PascalCase** for Components and Types.
- **snake_case** is permitted ONLY for database columns and Supabase-generated types.
- Use `// biome-ignore lint/style/useNamingConvention` when `snake_case` is required.
