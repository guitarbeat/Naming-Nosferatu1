# Analytics & Admin System Review

## Snapshot

This review reflects the current codebase after the admin role-detection, dashboard UX hardening, and audit-log overview pass on `main`.

## Current State

### Analytics Dashboard (`src/features/analytics/Dashboard.tsx`)

**Status**: Functional, but still shallow

**What exists**
- Top-n leaderboard rendering via `leaderboardAPI.getLeaderboard()`
- Per-user stats via `statsAPI.getUserStats()`
- Site-level summary stats via `statsAPI.getSiteStats()`
- Personal results and random-generator integration
- Admin-only hidden-name list with unhide controls

**Current limits**
- No ranking-history timeline or chart
- No popularity trend visualization
- No tournament-history view
- Admin analytics remain lighter than the dedicated admin dashboard

### Analytics Service (`src/services/analytics/analyticsService.ts`)

**Status**: Good

**What exists**
- `leaderboardAPI` for global rankings
- `statsAPI` for site and per-user stats
- Typed mapping and fallback handling for server responses
- User-rated-name support for richer personal analytics surfaces

**Current limits**
- No richer typed time-series models in active use
- The UI still consumes only a subset of the available analytics depth

### Admin Dashboard (`src/features/admin/AdminDashboard.tsx`)

**Status**: Functional, but incomplete

**What exists**
- Overview and names views with data-backed admin controls
- Derived counts for total, active, hidden, and locked names
- Single-name and bulk hide/unhide and lock/unlock actions
- Backend-backed recent admin actions rendered in the overview tab
- Toast feedback for admin writes and partial data failures
- Disabled/loading states during pending admin writes
- Refresh controls and clearer empty/error-state handling

**Current limits**
- No user-management tools
- No dedicated filtering/search for the audit history
- No confirmation flow for destructive admin actions

### Admin Identity / Authorization (`src/services/authAdapter.ts`)

**Status**: Functional, but still limited

**What exists**
- `/admin` is gated by resolved `isAdmin` state
- `checkAdminStatus()` now resolves admin state from Supabase role RPCs
- When Supabase role lookup is unavailable, admin detection falls back to the signed server roles endpoint
- Current-user resolution now uses persisted session data instead of hard-coded username heuristics

**Current limits**
- No grant/revoke workflow
- No role-management UI
- No frontend inspection/debug surface for how a session was classified

## Resolved Since The Previous Review

- Admin status is no longer hard-coded to demo behavior
- Dashboard write actions now expose success/error feedback
- Admin controls now disable while writes are in flight
- Bulk admin actions no longer depend on repeated full reloads to make progress
- Hide/unhide and lock/unlock actions now have a backend-backed recent-activity view
- The review itself now matches the actual repository state

## Highest-Value Remaining Work

### Priority 1: User Operations

Replace the old users placeholder with real role or user-activity tooling.

### Priority 2: Analytics Depth

Add one genuinely new analytics surface instead of more summary cards:
- ranking-history timeline
- popularity trend chart
- tournament activity history

### Priority 3: Admin UX Follow-Through

Build on the new feedback layer:
- confirmation for destructive actions when appropriate
- richer filtering and drill-down for audit history
- persistent result history beyond the recent-actions slice

### Priority 4: Admin Permissions Surface

Expose how a session was classified as admin and make role issues easier to diagnose.

## Suggested Next Epochs

1. Replace the old users placeholder with actual role or user activity data.
2. Add audit-log filtering and deeper action details.
3. Add one time-series analytics endpoint and consume it in the analytics surface.
