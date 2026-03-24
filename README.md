# Name Nosferatu

A React application for managing cat names and related data, featuring tournament-style voting, analytics, and Supabase integration.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.19.0
- **pnpm**: >= 10.26.0

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/guitarbeat/name-nosferatu.git
    cd name-nosferatu
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables:
- Copy `config/.env.example` to `.env` (if available) or set up the required Supabase environment variables:
        - `VITE_SUPABASE_URL`
        - `VITE_SUPABASE_ANON_KEY`
        - `DATABASE_URL` (for Drizzle/server operations)
        - `JWT_SECRET` (required for backend API auth)

### Repository layout notes

This repo keeps configuration files under `config/` now:

- `config/biome.json`, `config/knip.json`, `config/tsconfig.json`
- `config/vite.config.ts`, `config/vitest.config.ts`, `config/vitest.setup.ts`
- `config/tailwind.config.js`, `config/lefthook.yml`
- `config/capacitor.config.ts`
- `config/.env.example`, `config/.npmrc`, `config/.stylelintrc.json`, `config/.replit`

Root `package.json` scripts point to these files explicitly.

### Development

To start the Vite frontend dev server:

```bash
pnpm dev
```

To start the backend API server:

```bash
pnpm run dev:server
```

Run them in separate terminals for full-stack local development. The frontend uses the Vite default port (`5173`) and proxies `/api` requests to the backend on port `3001`. The backend requires `JWT_SECRET` to be set before startup.

### Testing

To run the test suite:

```bash
pnpm test
```

To run tests with coverage:

```bash
pnpm run test:coverage
```

### Code Quality

-   **Linting**: `pnpm run lint` (checks `src` and `server`)
-   **Fix Linting**: `pnpm run fix` or `pnpm run lint:fix`
-   **Maintenance Suite**: `pnpm run check:maintenance` (runs case-collision, copy-artifact, env, architecture, and circular dependency checks)
-   **Dependency Check**: `pnpm run check:deps` (using Knip)

## 📚 Documentation

For more detailed information, please refer to the [docs](./docs) directory:

-   [Contributing Guide](./docs/CONTRIBUTING.md): Setup, coding standards, and workflow.
-   [Architecture](./docs/ARCHITECTURE.md): System design and component architecture.
-   [API Reference](./docs/API.md): API endpoints and database schema.
-   [Testing Strategy](./docs/TESTING.md): How to run tests and understand the testing approach.

## 🛠️ Tech Stack

-   **Frontend**: React 19, Vite, Tailwind CSS, Zustand, TanStack Query
-   **Backend**: Node.js, Express, Drizzle ORM
-   **Database**: Supabase (PostgreSQL)
-   **Testing**: Vitest, React Testing Library, Supertest
-   **Tooling**: Biome, TypeScript, pnpm

## Root structure

Minimal root directories:

- `.github`
- `config`
- `docs`
- `public`
- `scripts`
- `server`
- `shared`
- `src`
- `supabase`

Root files:

- `.biomeignore`
- `.gitignore`
- `LICENSE`
- `README.md`
- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `vercel.json`
