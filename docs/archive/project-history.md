# Project History Archive

**Consolidated from:** REGRESSION_TIMELINE.md + STROLL_THROUGH_MEMORY_LANE.md  
**Last Updated:** March 18, 2026  
**Status:** Historical Reference - Do not edit for current development

---

## Executive Summary

This document contains the complete historical narrative of **Naming-Nosferatu**, from the first commit on **February 28, 2025** through **March 12, 2026**. It covers both the chronological development story and detailed regression tracking.

**History span:** `2025-02-28` to `2026-03-12`  
**Total commits:** `2996`  
**Busiest month:** `2026-02` with `665` commits

---

## Development Eras

### Era 1: The Prototype Cat Walk (February 2025 - April 2025)
The project started as a fast-moving experiment with chaotic commit messages like "tiny changes", "cleaned", "gave up on spinner lol", "Bongo", "cat". Core concepts emerged: names, ratings, login, analytics, images, and hide/toggle controls.

**Key milestones:**
- `3b2e7f1b` - Initial repository setup with `.gitignore`
- `766f720a` - Elo rating logic cleanup
- `cdd4954f` - Consistent name display across components
- `e40cada5` - Easier login flow
- `81afaab8` - Early analytics work

### Era 2: The Project Learns To Be Maintained (June 2025)
June 2025 marked the first professionalization moment with README, docs, linters, tests, and code cleanup. The project transitioned from "app" to "codebase".

**Key improvements:**
- `513ce5b9` - Added README and component documentation
- `2bf28a1f` - Added `.env` example and setup docs
- `196757b7` - Added ESLint and Stylelint configs
- `4f03fa47` - Added Jest and React Testing Library setup

### Era 3: Theme-and-Mobile Expansion (August 2025)
Major UX acceleration with theming, mobile responsiveness, onboarding, accessibility, and error handling. Styling became a systematic concern.

### Era 4: Welcome-Screen Chapter (September 2025)
Focus on first-run experience with `WelcomeScreen` components and improved user onboarding flow.

### Era 5: Deployment and Backend Maturity (October 2025)
Operational concerns became explicit with `vercel.json`, broader config work, and Supabase migration files.

### Era 6: State and Structure Consolidation (Late 2025 - Early 2026)
Repeated compression of the app into fewer abstractions, with major work on tournament state, shared components, and app structure.

### Era 7: Security and Automation Wave (February 2026)
Server hardening with `server/routes.ts`, `server/auth.ts`, `server/db.ts`, `.github/workflows/ci.yml`, and related process files.

### Era 8: Admin Visibility and Cleanup Phase (March 2026)
Current app shape through `AdminDashboard.tsx`, analytics services, API consolidation, and broad cleanup of styling, docs, and dependencies.

---

## Regression Timeline

This section tracks specific regressions and their fixes, with explicit failure modes and repair evidence.

### 2026-03-14 Review Checklist
- [x] Static preview no longer hard-fails when both `/api` and Supabase are unavailable
- [x] Logged-out profile avatar uses bundled local cat asset instead of external host
- [x] Production builds no longer inject dev-only console-forwarding bridge
- [x] Logged-out homepage no longer auto-scrolls to profile form on first load
- [x] Local previews no longer load Vercel analytics script
- [x] Mobile picker controls stack cleanly on small screens
- [x] Deployment fallback watches actual app entrypoint
- [x] Concurrent startup fetches share one in-flight request
- [x] Production builds split vendor code into dedicated chunks
- [x] Local fallback mode emits minimal startup noise
- [x] Production builds no longer warn about mixed Supabase imports
- [x] Batch-hide route test has realistic timeout budget

### 2025 Regressions

**April 20, 2025**
- **Wrong:** Name rendering drifted across profile, storage, and display surfaces
- **Made right:** Unified how names were read, stored, and rendered
- **Evidence:** `cdd4954f`
- **Files:** `src/components/Profile/Profile.js`, `src/supabase/supabaseClient.js`

**June 5, 2025** (Multiple issues)
- **Wrong:** Duplicate `StatsCard` import created component breakage
- **Made right:** Removed duplicate import path
- **Evidence:** `4235553c`

- **Wrong:** Hook parse errors and lint violations blocked builds
- **Made right:** Repaired broken hook syntax and cleaned files
- **Evidence:** `526fbce1`

- **Wrong:** Theme-toggle behavior regressed
- **Made right:** Reconnected toggle flow with theme styles
- **Evidence:** `c6d8a05c`

**August 26-27, 2025** (CSS and Environment issues)
- **Wrong:** Badge CSS composition casing broke styling
- **Made right:** Corrected composition casing
- **Evidence:** `877d077a`

- **Wrong:** Missing Supabase environment variables caused deployment failures
- **Made right:** Added graceful handling for absent Supabase env
- **Evidence:** `efdff51c`, `c82f4353`

- **Wrong:** Blocking sort in tournament logic caused timeouts
- **Made right:** Removed blocking sort from hot path
- **Evidence:** `4f5ed34d`

- **Wrong:** Drag-end logic and profile filter typos caused glitches
- **Made right:** Fixed drag handler and corrected filter mistakes
- **Evidence:** `2a3605ac`

- **Wrong:** Merge-conflict debris left extra braces causing parse failures
- **Made right:** Removed stray conflict leftovers
- **Evidence:** `35e33ad9`

**September 9, 2025**
- **Wrong:** Profile behavior broke for specific user path
- **Made right:** Adjusted profile/name-card/nav styling
- **Evidence:** `6eff7ddf`

**September 19, 2025**
- **Wrong:** Stray closing brace in global CSS caused build failure
- **Made right:** Removed syntax error
- **Evidence:** Commit fixing CSS syntax

---

## Key Patterns and Lessons

1. **Early Chaos → Systematic Approach:** Project evolved from experimental prototype to maintained codebase
2. **Theme System Investment:** August 2025 theming work prevented future styling regressions
3. **Environment Handling:** Multiple Supabase/environment regressions led to robust fallback mechanisms
4. **State Management:** Tournament state consolidation eliminated entire categories of bugs
5. **Build Process:** Production build issues drove chunking and optimization improvements
6. **Testing Infrastructure:** Test flakiness issues led to better timeout and isolation practices

---

## File Evolution

### Historical Paths (No longer exist at HEAD)
- `src/components/Profile/Profile.js` → `src/features/tournament/`
- `src/components/Tournament/EloRating.js` → `src/features/tournament/`
- `src/utils/EloRating.js` → `src/shared/lib/`
- `src/supabase/supabaseClient.js` → `src/integrations/supabase/`
- `backend/supabase/migrations/` → `supabase/migrations/`

### Current Architecture
- `src/features/` - Domain-driven feature organization
- `src/shared/` - Reusable components and utilities
- `src/store/` - Zustand state management
- `src/services/` - API and integration layer
- `supabase/` - Database and migrations

---

## Commit Rhythm Analysis

| Month | Commits | Character |
|-------|---------|-----------|
| 2025-02 | 4 | Repository birth |
| 2025-03 | 12 | Early gameplay experiments |
| 2025-04 | 29 | Product shaping |
| 2025-06 | 51 | Tooling and documentation |
| 2025-08 | 142 | UX acceleration |
| 2025-09 | 113 | Welcome-screen era |
| 2025-10 | 476 | Operational maturity |
| 2025-11 | 326 | UI system churn |
| 2025-12 | 252 | Type safety push |
| 2026-01 | 525 | Structural refactors |
| 2026-02 | 665 | Peak automation |
| 2026-03 | 399 | Cleanup and admin work |

---

*This archive serves as historical context. For current development practices, see CONTRIBUTING.md and ARCHITECTURE.md.*
