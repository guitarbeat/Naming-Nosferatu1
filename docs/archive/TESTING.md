# Testing Strategy

This project uses **Vitest** for testing, with **React Testing Library** for frontend components and **Supertest** for backend routes.

## Test Commands

-   **Run all tests**: `pnpm test`
-   **Run tests in watch mode**: `pnpm run test:watch`
-   **Run tests with coverage**: `pnpm run test:coverage`

## Backend Testing

The backend tests are split into two categories:

### 1. Mock Mode (`server/routes.test.ts`)
These tests verify the API endpoints when the database is unavailable. The server falls back to "mock mode", returning static data. This ensures the API remains responsive even if the DB connection fails.

-   **Focus**: Route handling, input validation, fallback logic.
-   **Mocking**: `server/db` is mocked to be `null`.

### 2. Database Mode (`server/routes.db.test.ts`)
These tests verify the API endpoints when the database is available. They mock the Drizzle ORM to simulate database interactions.

-   **Focus**: Database queries, CRUD operations, business logic involving data persistence.
-   **Mocking**: `server/db` is mocked to provide a functional `db` object with mocked methods (`insert`, `select`, `update`, `delete`, etc.).

## Frontend Testing

Frontend tests are located alongside the components they test (e.g., `src/app/App.test.tsx`).

-   **Tools**: React Testing Library, Vitest.
-   **Mocking**:
    -   `@/shared/services/supabase/client`: Mocked to prevent actual network calls.
    -   `@/shared/services/apiClient`: Mocked to simulate API responses.
    -   Complex providers and hooks (e.g., `useAuth`, `useAppStore`) are often mocked to isolate component logic.

## Coverage

We aim for high test coverage, especially in critical paths like:
-   Server API routes (`server/routes.ts`)
-   Data validation (`server/validation.ts`)
-   Core business logic (`src/services/`)

Run `pnpm run test:coverage` to view the current coverage report.
