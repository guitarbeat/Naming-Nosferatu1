# Deployment Guide

**Last Updated:** March 12, 2026

## Overview

Name Nosferatu is deployed as a web application with a Vite-based frontend and Express backend. The application uses Supabase for database and authentication services.

### Platform Support

The application is designed as a progressive web app (PWA) and runs in modern web browsers. Native mobile app support via Capacitor has been removed as of March 2026 to focus on web-first deployment.

## Environment Variables

### Required Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Frontend |
| `DATABASE_URL` | PostgreSQL connection string | Backend/Drizzle |
| `ADMIN_API_KEY` | Secret key for admin API authentication | Backend |
| `CORS_ORIGIN` | Allowed CORS origin (defaults to localhost) | Backend |

### Example Configuration

```bash
VITE_SUPABASE_URL=https://ocghxwwwuubgmwsxgyoy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
DATABASE_URL=postgresql://user:pass@host:5432/db
ADMIN_API_KEY=your_secret_key
CORS_ORIGIN=https://yourdomain.com
```

## Development Server

### Local Development

```bash
pnpm dev
```

This starts:
- Frontend: Vite dev server on port **5000** with HMR and polling-based file watching
- Backend: Express server on port **3001**, proxied from Vite via `/api` prefix

### Mock Mode

When `DATABASE_URL` is not set, the server falls back to mock data, allowing development without a database.

## Production Deployment

### Vercel (Recommended)

The application is configured for Vercel deployment:

- **Build Command**: `pnpm run build`
- **Output Directory**: `dist`
- **Deployment Target**: Static
- **Branch**: Builds from `main` branch only

Configuration is in `vercel.json`.

### Build Process

```bash
pnpm run build    # Build for production
pnpm run preview  # Preview production build locally
```

## External Services

### Supabase

- **URL**: `ocghxwwwuubgmwsxgyoy.supabase.co`
- **Purpose**: PostgreSQL database and authentication provider
- **Access**: Via Supabase JS client (frontend) and Drizzle ORM (backend)

### Vercel Analytics

Client-side analytics via `@vercel/analytics/react` is integrated for production monitoring.

## Authentication & Authorization

### Admin Role Detection

The application uses a multi-layered approach for admin authentication:

1. **Primary Method**: Supabase role-based access control (RBAC)
   - Admin status is resolved via `checkAdminStatus()` in `src/services/authAdapter.ts`
   - Queries the `user_roles` table through Supabase RPC functions
   - Roles are stored separately from user data to prevent privilege escalation

2. **Fallback Method**: Signed server roles endpoint
   - When Supabase role lookup is unavailable, the system falls back to the `/api/auth/roles` endpoint
   - Provides resilience during database connectivity issues

3. **Session Management**
   - Current user resolution uses persisted session data
   - No hard-coded username heuristics
   - Admin routes (`/admin`) are gated by resolved `isAdmin` state

### Role Management

- Roles are managed through the `user_roles` table in the database
- Supports both `user_name` (for `cat_app_users`) and `user_id` (for `auth.users`)
- Available roles: `user`, `moderator`, `admin`
- Role assignment requires existing admin privileges to prevent privilege escalation

## Analytics Features

### Recent Activity Tracking

The analytics dashboard includes a 14-day activity trend feature:

- **Data Source**: Tournament selections recorded in the `tournament_selections` table
- **Endpoint**: `statsAPI.getActivityTrend()` in `src/services/analytics/analyticsService.ts`
- **Visualization**: Time-series chart showing daily tournament participation
- **Purpose**: Provides insights into user engagement patterns and platform activity

### Available Analytics

- **Leaderboard**: Global rankings via `leaderboardAPI.getLeaderboard()`
- **User Stats**: Per-user statistics via `statsAPI.getUserStats()`
- **Site Stats**: Platform-wide summary via `statsAPI.getSiteStats()`
- **Activity Trends**: 14-day rolling activity window
- **Personal Results**: Individual user performance and rating history
- **Admin Analytics**: Hidden name management and user activity summaries

## User Preferences

Preferred communication style: Simple, everyday language.
