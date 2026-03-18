# Bug Fixes - Name Nosferatu Tournament App

## Completed Fixes ✅

### 1. Elo K-factor Always Doubled (Critical)
- **Status**: ✅ FIXED
- **Severity**: Critical
- **Issue**: Game count was never passed to `updateRating()`, causing K-factor to be permanently doubled (80 instead of 40)
- **Impact**: All player ratings were too volatile, never normalizing after 15+ games
- **Root Cause**: `calculateNewRatings()` calculated game counts but didn't pass them to `updateRating()`
- **Solution**: Calculate `gamesA` and `gamesB` from stats and pass to `updateRating()`
- **Files Changed**: `src/features/tournament/services/tournament.ts`
- **Commit**: `636ea0a` (Correctly adjust player ratings based on game history and team size)

### 2. 2v2 Team Rating Changes Halved (Critical)
- **Status**: ✅ FIXED
- **Severity**: Critical
- **Issue**: Team Elo delta was divided by team size before applying to members
- **Impact**: Team ratings only moved at 50% of intended speed
- **Root Cause**: Line 124-125 in `applyTeamMatchElo()` incorrectly divided delta by `memberIds.length`
- **Solution**: Apply full delta to each member without dividing by team size
- **Files Changed**: `src/features/tournament/services/tournament.ts`
- **Commit**: `636ea0a`

### 3. Page Flashing on Tournament Load (High)
- **Status**: ✅ FIXED
- **Severity**: High
- **Issue**: `persistentState` in effect dependency array caused infinite re-renders
- **Impact**: Visible flashing when selecting names or initializing tournament
- **Root Cause**: Initialization effect included `persistentState` as dependency, triggering re-run after state updates
- **Solution**: Remove `persistentState` from dependency array (only need to reinitialize when names change)
- **Files Changed**: `src/features/tournament/hooks/useTournamentState.ts`
- **Commit**: `04074911` (Fix page flashing by adjusting tournament state initialization)

### 4. Tournament Results Not Saved to Database (High)
- **Status**: ✅ FIXED
- **Severity**: High
- **Issue**: Ratings only stored locally; never persisted to global database
- **Impact**: Global leaderboard never reflected actual user voting
- **Root Cause**: Missing API call to persist ratings after tournament completion
- **Solution**: 
  - Added `ratingsAPI.saveRatings()` function
  - Added effect in `TournamentFlow` to save ratings when tournament completes
- **Files Changed**: 
  - `src/shared/services/supabase/api.ts` (added ratingsAPI)
  - `src/features/tournament/modes/TournamentFlow.tsx` (added save effect)
- **Commit**: `2e301ed` (Add ability to save tournament ratings to the database)

### 5. Bracket Desync on Undo (Medium)
- **Status**: ✅ FIXED
- **Severity**: Medium
- **Issue**: Manual calculation of `currentRound`/`currentMatch` could diverge from bracket-derived state
- **Impact**: Undo could show wrong match or get stuck in edge cases
- **Root Cause**: Two sources of truth: manual math vs. `bracketDerived` calculations
- **Solution**: Remove manual `currentRound`/`currentMatch` calculations; let bracket recalculate from `matchHistory`
- **Files Changed**: `src/features/tournament/hooks/useTournamentState.ts`
- **Commit**: `d9855d94` (Add warning for fallback data and adjust animation timing)

### 6. Silent Fallback to Demo Data (Medium)
- **Status**: ✅ FIXED
- **Severity**: Medium
- **Issue**: Database failures silently fell back to demo data without user notification
- **Impact**: Users confused about whether data was real or demo
- **Root Cause**: Fallback logic didn't track or communicate state
- **Solution**: 
  - Added `usingFallbackData` flag to track demo data usage
  - Added console warning and toast notification
- **Files Changed**: 
  - `src/shared/services/supabase/api.ts` (tracking flag)
  - `src/features/tournament/components/NameSelector.tsx` (warning toast)
- **Commit**: `d9855d94`

### 7. Animation Timing Jank (Medium)
- **Status**: ✅ FIXED
- **Severity**: Medium
- **Issue**: Vote animation cooldown (300ms) too short for state updates
- **Impact**: Next match could pop in before animation finished
- **Root Cause**: VOTE_COOLDOWN didn't account for state update time
- **Solution**: Increased `VOTE_COOLDOWN` from 300ms to 500ms
- **Files Changed**: `src/features/tournament/hooks/useTournamentState.ts`
- **Commit**: `d9855d94`

---

## Known Issues (Future Work)

### Image Upload Not Implemented
- **File**: `src/shared/services/supabase/api.ts` (line 93-98)
- **Issue**: `imagesAPI.upload()` returns hardcoded error message
- **Impact**: Admin dashboard can't upload cat images
- **Priority**: Low (UI suggests feature incomplete)

### JWT Authentication Conflicts
- **File**: `server/routes.ts`, `server/auth.ts`
- **Issue**: Two parallel auth systems (Express JWT + Supabase Auth) not unified
- **Impact**: Admin routes bypass user context checks
- **Priority**: Medium

### Snake Case vs Camel Case Mismatch
- **Files**: `server/routes.ts`, `src/shared/services/supabase/api.ts`
- **Issue**: Database returns snake_case (avg_rating) but some code expects camelCase
- **Impact**: Potential field mapping errors
- **Priority**: Low (mostly handled by mappers)

---

## Testing Notes

### Verified Fixes
- ✅ Elo ratings now normalize after 15+ games
- ✅ 2v2 team ratings move at correct speed
- ✅ No page flashing during tournament initialization
- ✅ Ratings saved to database on tournament completion
- ✅ Undo operation properly resets bracket state
- ✅ Toast warning shown when using demo data
- ✅ Smooth vote animations without state jank

### Test Scenarios
1. Run 1v1 tournament with 2-3 matches → ratings should stabilize
2. Run 2v2 tournament → team averages should move correctly
3. Undo multiple times → bracket should stay in sync
4. Disconnect database → should see warning toast
5. Complete tournament → check database for saved ratings
