# Analytics & Admin System Review

## Snapshot

This review reflects the current codebase after the admin role-detection and dashboard UX hardening passes on `main`.

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
- Overview, names, users, and analytics tabs
- Derived counts for total, active, hidden, and locked names
- Single-name and bulk hide/unhide and lock/unlock actions
- Toast feedback for admin writes and upload attempts
- Disabled/loading states during pending admin writes
- Refresh controls and clearer empty-state handling in the names tab

**Current limits**
- No audit-log view
- No user-management tools
- Users and analytics tabs are still summary-oriented
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
- The review itself now matches the actual repository state

## Highest-Value Remaining Work

### Priority 1: Admin Auditability

Add a backend-backed audit log for hide/unhide and lock/unlock actions, then surface it in the overview tab.

### Priority 2: Analytics Depth

Add one genuinely new analytics surface instead of more summary cards:
- ranking-history timeline
- popularity trend chart
- tournament activity history

### Priority 3: User Operations

Replace the users tab placeholder with real user-management or user-activity tooling.

### Priority 4: Admin UX Follow-Through

Build on the new feedback layer:
- confirmation for destructive actions when appropriate
- richer empty/loading/error states outside the names tab
- persistent result history instead of transient toasts only

## Suggested Next Epochs

1. Add audit-log reads and render recent admin actions in the overview tab.
2. Replace the users tab placeholder with actual role/user activity data.
3. Add one time-series analytics endpoint and consume it in the analytics tab.
