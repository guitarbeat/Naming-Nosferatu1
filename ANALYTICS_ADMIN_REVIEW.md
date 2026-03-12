# Analytics & Admin System Review

## Current State Analysis

### 1. Analytics Dashboard (`src/features/analytics/Dashboard.tsx`)

**Status**: ⚠️ Minimal/Placeholder

**What's There**:
- Basic component structure with props for admin features
- RandomGenerator component (working)
- Placeholder text saying "Full analytics dashboard... coming soon"

**What's Missing**:
- No actual analytics visualizations (charts, graphs, rankings)
- No leaderboard display
- No personal results/statistics
- No name popularity tracking
- No tournament history
- Props are defined but not used: `isAdmin`, `canHideNames`, `onNameHidden`, `personalRatings`, `currentTournamentNames`, `onUpdateRatings`

**Recommendation**: The analytics service has all the data fetching logic ready, but the UI components need to be built or restored from git history.

---

### 2. Analytics Service (`src/services/analytics/analyticsService.ts`)

**Status**: ✅ Well-Implemented

**What's There**:
- Three comprehensive API namespaces:
  - `analyticsAPI`: Selection popularity, popularity scores, ranking history
  - `leaderboardAPI`: Global leaderboard rankings
  - `statsAPI`: Site-wide and user-specific statistics
- Proper TypeScript types with snake_case matching database columns
- Error handling via `withSupabase` wrapper
- Complex aggregation logic for rankings and popularity

**Strengths**:
- Well-documented with JSDoc comments
- Handles both user-specific and global analytics
- Supports filtering by date ranges and user
- Calculates percentiles and popularity scores
- Ready for immediate use

**Recommendation**: This is production-ready. Just needs UI components to consume it.

---

### 3. Admin System

**Status**: ⚠️ Partially Implemented

#### Admin Status Tracking

**What's There**:
- `isAdmin` field in user state (`src/store/appStore.ts`)
- `setAdminStatus()` action to update admin status
- `selectIsAdmin` selector for components
- Role hierarchy system in `Providers.tsx` (user < moderator < admin)
- `hasRole()` utility function for role checks

**What's Missing**:
- No actual admin status checking against database
- `checkAdminStatus()` in Providers always returns `false`
- No UI to grant/revoke admin status
- No admin-only routes or protected sections

#### Hidden Names Feature

**Status**: ✅ Backend Complete, ❌ UI Missing

**What's There** (Backend):
- `hiddenNamesAPI` in Supabase client with full CRUD:
  - `hideName()` - hide a single name
  - `unhideName()` - unhide a single name  
  - `hideNames()` - bulk hide
  - `unhideNames()` - bulk unhide
  - `getHiddenNames()` - fetch all hidden names
- Database column `is_hidden` on `cat_name_options` table
- Filtering logic in `applyNameFilters()` - non-admins never see hidden names
- Visual indicators in `Card.tsx` component (🔒 HIDDEN badge, amber styling)

**What's Missing** (UI):
- No admin panel to hide/unhide names
- No UI controls on name cards for admins
- Dashboard props `canHideNames` and `onNameHidden` are defined but never used
- No list view of hidden names for admins

---

### 4. Integration Points

#### App.tsx
- Passes `userName` to Dashboard but not `isAdmin`
- No admin status initialization on app load
- No admin-specific routes

#### FluidNav.tsx
- No admin menu or controls
- Could add admin panel toggle here

#### Store (appStore.ts)
- Admin status persists in memory but not localStorage
- No initialization from Supabase on login

---

## Recommendations

### Priority 1: Complete Analytics Dashboard

1. **Restore or Build Analytics Components**:
   - Leaderboard table (use `leaderboardAPI.getLeaderboard()`)
   - Personal results card (use `statsAPI.getUserStats()`)
   - Popularity charts (use `analyticsAPI.getPopularityScores()`)
   - Ranking history bump chart (use `analyticsAPI.getRankingHistory()`)
   - Site statistics overview (use `statsAPI.getSiteStats()`)

2. **Wire Up Existing Props**:
   - Use `personalRatings` to show user's tournament results
   - Use `currentTournamentNames` to highlight recently played names
   - Connect `onUpdateRatings` to allow rating adjustments

### Priority 2: Implement Admin Controls

1. **Admin Status Detection**:
   ```typescript
   // In Providers.tsx or a new adminService.ts
   checkAdminStatus: async (userName: string) => {
     // Query Supabase for admin role
     // Could use a cat_app_users.role column or separate admins table
     const { data } = await supabase
       .from('cat_app_users')
       .select('role')
       .eq('user_name', userName)
       .single();
     
     return data?.role === 'admin';
   }
   ```

2. **Admin Panel UI**:
   - Add admin toggle in FluidNav (only visible to admins)
   - Create admin section with:
     - List of all names with hide/unhide buttons
     - Bulk actions (hide selected, unhide all)
     - User management (grant/revoke admin)
     - Site statistics dashboard

3. **Name Card Admin Controls**:
   ```tsx
   // In NameSelector or wherever names are displayed
   {isAdmin && (
     <button onClick={() => onNameHidden(name.id)}>
       {name.isHidden ? 'Unhide' : 'Hide'}
     </button>
   )}
   ```

### Priority 3: Database Schema Updates

Add to Supabase:

```sql
-- Add role column to users table
ALTER TABLE cat_app_users 
ADD COLUMN role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'moderator', 'admin'));

-- Create index for admin queries
CREATE INDEX idx_users_role ON cat_app_users(role);

-- Create admin audit log
CREATE TABLE cat_admin_actions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Priority 4: Security & RLS

Ensure Row Level Security policies:

```sql
-- Only admins can update is_hidden
CREATE POLICY "Admins can hide names"
ON cat_name_options FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cat_app_users 
    WHERE user_name = current_user 
    AND role = 'admin'
  )
);

-- Only admins can see hidden names
CREATE POLICY "Admins see hidden names"
ON cat_name_options FOR SELECT
USING (
  is_hidden = false 
  OR EXISTS (
    SELECT 1 FROM cat_app_users 
    WHERE user_name = current_user 
    AND role = 'admin'
  )
);
```

---

## Quick Wins

1. **Pass `isAdmin` to Dashboard** (5 min):
   ```tsx
   // In App.tsx AnalysisContent
   <DashboardLazy
     userName={user.name ?? ""}
     isAdmin={user.isAdmin}  // Add this
     // ... other props
   />
   ```

2. **Initialize Admin Status on Login** (10 min):
   ```typescript
   // In appStore.ts login action
   login: async (userName) => {
     const isAdmin = await checkAdminStatus(userName);
     set({ user: { name: userName, isLoggedIn: true, isAdmin } });
   }
   ```

3. **Show Hidden Names Count** (5 min):
   ```tsx
   // In Dashboard
   const { data: stats } = await statsAPI.getSiteStats();
   <p>Hidden Names: {stats.hiddenNames}</p>
   ```

---

## Summary

**Analytics**: Backend is solid, frontend is a placeholder. Need to build/restore UI components.

**Admin**: Infrastructure is 80% there, but missing the actual admin detection and UI controls. The hidden names feature is fully implemented on the backend but has no UI.

**Next Steps**:
1. Decide if you want to restore analytics components from git history or build new ones
2. Add admin role to database schema
3. Implement admin status checking
4. Build admin panel UI
5. Wire up hidden names controls for admins
