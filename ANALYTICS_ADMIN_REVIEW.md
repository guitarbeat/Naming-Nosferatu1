# Analytics & Admin System Review

## Snapshot

This review reflects the current codebase after the admin role-detection, dashboard UX hardening, audit-log overview, and recent-activity trend pass on `main`.

## Current State

### Analytics Dashboard (`src/features/analytics/Dashboard.tsx`)

**Status**: Functional, with one real time-series surface now in place

**What exists**
- Top-n leaderboard rendering via `leaderboardAPI.getLeaderboard()`
- Per-user stats via `statsAPI.getUserStats()`
- Site-level summary stats via `statsAPI.getSiteStats()`
- 14-day recent-activity trend driven by recorded tournament selections
- Personal results and random-generator integration
- Admin-only hidden-name list with unhide controls

**Current limits**
- No ranking-history timeline or chart
- No popularity trend visualization yet
- No tournament-history view
- Admin analytics remain lighter than the dedicated admin dashboard

### Analytics Service (`src/services/analytics/analyticsService.ts`)

**Status**: Good

**What exists**
- `leaderboardAPI` for global rankings
- `statsAPI` for site and per-user stats
- Typed recent-activity trend support via `statsAPI.getActivityTrend()`
- Typed mapping and fallback handling for server responses
- User-rated-name support for richer personal analytics surfaces

**Current limits**
- The UI still consumes only a subset of the available analytics depth
- The only live time-series view today is recent tournament activity

### Admin Dashboard (`src/features/admin/AdminDashboard.tsx`)

**Status**: Functional, but incomplete

**What exists**
- Overview, names, and users views with data-backed admin controls
- Derived counts for total, active, hidden, and locked names
- Single-name and bulk hide/unhide and lock/unlock actions
- Backend-backed recent admin actions rendered in the overview tab
- Basic filtering for visibility vs. locking history
- User activity summaries with role labels and recent activity metadata
- Toast feedback for admin writes and partial data failures
- Disabled/loading states during pending admin writes
- Refresh controls and clearer empty/error-state handling

**Current limits**
- No grant/revoke role workflow
- No deeper search or drill-down for the audit history
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
- The analytics dashboard now includes a backend-backed 14-day activity trend instead of only summary cards
- The review itself now matches the actual repository state

## Highest-Value Remaining Work

### Priority 1: Analytics Depth

Build on the new time-series baseline:
- ranking-history timeline
- popularity trend chart
- tournament activity history

### Priority 2: User Operations

Build on the new users view:
- role grant/revoke workflow
- richer per-user drill-down
- user activity history beyond aggregate counters

### Priority 3: Admin UX Follow-Through

Build on the new feedback layer:
- confirmation for destructive actions when appropriate
- richer audit-history drill-down and longer history windows
- persistent result history beyond the recent-actions slice

### Priority 4: Admin Permissions Surface

Expose how a session was classified as admin and make role issues easier to diagnose.

## Suggested Next Epochs

1. Add a second time-series surface, likely ranking-history or popularity trends.
2. Add role management or per-user drill-down to the users view.
3. Add deeper audit-log drill-down and longer history windows.
