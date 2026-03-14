# Regression Timeline

Companion to `docs/STROLL_THROUGH_MEMORY_LANE.md`.

This version makes the failure mode and the repair explicit for each regression:
- `Wrong` states what broke.
- `Made right` states how the repo history shows it was corrected.
- `Evidence` cites the clearest fix or stabilization commits.
- `Files` lists representative historical paths touched by the repair.

Notes:
- Dates are the dates of the repair or investigation commit, not necessarily the date the regression was introduced.
- `Made right` is based on commit messages plus representative touched files. When commit history is terse, the wording is an informed inference rather than a verbatim claim from the code.
- File paths are historical. This repo was reorganized heavily, so some paths no longer exist at `HEAD`.

## 2026-03-14 Review Checklist

- [x] Static preview no longer hard-fails when both `/api` and Supabase are unavailable; bundled fallback names now keep the site browsable.
- [x] Logged-out profile avatar no longer depends on an external image host; it now uses a bundled local cat asset.
- [x] Production/static builds no longer inject the dev-only console-forwarding bridge that was posting to `/api/debug/client-logs` without a backend.
- [x] Logged-out homepage no longer auto-scrolls toward the profile form on first load; profile input focus is now limited to explicit edit actions.
- [x] Local/static previews no longer load the Vercel analytics script, avoiding `_vercel/insights` 404 noise outside real production hosts.
- [x] Mobile picker control rows no longer collapse into cramped overlapping buttons; small screens now stack those actions cleanly.
- [x] Deployment fallback no longer false-triggers while the real app bundle is still booting; it now watches the actual app entrypoint and clears once `#root` mounts.
- [x] Concurrent startup fetches for cat names now share one in-flight request, so fallback mode does not double-hit `/api/names` during initial load.
- [x] Production builds no longer emit the >500 kB main-chunk warning; stable vendor code is split into dedicated chunks.

## 2025

- `2025-04-20`
  Wrong: Name rendering drifted across profile, storage, and display surfaces.
  Made right: Unified how names were read, stored, and rendered so the same record displayed consistently.
  Evidence: `cdd4954f`.
  Files: `src/components/Profile/Profile.js`, `src/components/Profile/Profile.module.css`, `src/supabase/supabaseClient.js`, `src/supabase/useSupabaseStorage.js`.

- `2025-06-05`
  Wrong: A duplicate `StatsCard` import created a component-level breakage.
  Made right: Removed the duplicate import path and restored a single valid `StatsCard` source.
  Evidence: `4235553c`.
  Files: `src/components/Profile/Profile.js`, `src/components/Results/Results.js`, `src/components/StatsCard/StatsCard.js`, `src/components/StatsCard/StatsCard.module.css`.

- `2025-06-05`
  Wrong: Hook parse errors and lint violations were severe enough to block builds.
  Made right: Repaired the broken hook syntax and cleaned the surrounding files until the build could pass again.
  Evidence: `526fbce1`.
  Files: `src/App.js`, `src/components/BongoCat/BongoCat.js`, `src/components/NavBar/NavBar.js`, `src/components/Profile/Profile.js`.

- `2025-06-05`
  Wrong: Theme-toggle behavior regressed and no longer switched or styled the app correctly.
  Made right: Reconnected the toggle flow with the expected theme styles and supporting CSS.
  Evidence: `c6d8a05c`.
  Files: `src/components/Bracket/Bracket.module.css`, `src/components/CalendarButton/CalendarButton.module.css`, `src/components/ErrorBoundary/ErrorBoundary.module.css`, `src/components/LoadingSpinner/LoadingSpinner.module.css`.

- `2025-08-26`
  Wrong: Badge CSS composition casing broke styling or build expectations.
  Made right: Corrected the composition casing so the stylesheet resolved as intended.
  Evidence: `877d077a`.
  Files: `src/components/Bracket/Bracket.module.css`.

- `2025-08-26`
  Wrong: Missing Supabase environment variables caused deployed site-loading failures.
  Made right: Added graceful handling for absent Supabase env so the app stopped failing hard at startup.
  Evidence: `efdff51c`, `c82f4353`.
  Files: `src/hooks/useUserSession.js`, `src/supabase/supabaseClient.js`.

- `2025-08-27`
  Wrong: A blocking sort in tournament logic caused timeouts.
  Made right: Removed the blocking sort from the hot path so tournament setup no longer stalled.
  Evidence: `4f5ed34d`.
  Files: `src/hooks/useTournament.js`.

- `2025-08-27`
  Wrong: Drag-end logic and profile filter typos caused setup/profile glitches.
  Made right: Fixed the drag handler and corrected the profile-filter mistakes so those flows behaved normally again.
  Evidence: `2a3605ac`.
  Files: `src/components/Profile/ProfileFilters.jsx`, `src/components/TournamentSetup/TournamentSetup.jsx`.

- `2025-08-27`
  Wrong: Merge-conflict debris left extra braces in the code and caused parse failures.
  Made right: Removed the stray conflict leftovers and restored syntactically valid components.
  Evidence: `35e33ad9`.
  Files: `src/components/Tournament/Tournament.jsx`, `src/hooks/useTournament.js`.

- `2025-08-27`
  Wrong: CSS module composition regressed in the profile UI.
  Made right: Reworked the module composition so the profile stylesheet built and composed correctly again.
  Evidence: `b1fd2994`.
  Files: `src/components/Profile/Profile.module.css`.

- `2025-09-09`
  Wrong: Profile behavior broke badly enough for one user path to get its own repair commit.
  Made right: Adjusted the affected profile/name-card/nav styling path until that broken profile flow rendered correctly again.
  Evidence: `6eff7ddf`.
  Files: `src/components/Bracket/Bracket.module.css`, `src/components/NameCard/NameCard.jsx`, `src/components/NameCard/NameCard.module.css`, `src/components/NavBar/navbar.css`.

- `2025-09-19`
  Wrong: A stray closing brace in global CSS caused a build failure.
  Made right: Removed the invalid brace and restored valid CSS parsing.
  Evidence: `7aedd18c`.
  Files: `src/features/auth/Login.module.css`, `src/features/profile/Profile.jsx`, `src/features/profile/Profile.module.css`, `src/features/profile/ProfileNameList.jsx`.

- `2025-09-30`
  Wrong: The welcome screen regressed on overflow, scrolling, and long-name wrapping.
  Made right: Tightened the welcome-screen layout so long content wrapped and fit without broken scrolling.
  Evidence: `4e3a0d25`, `84d5e4ec`, `bafd3d8f`.
  Files: `src/shared/components/WelcomeScreen/WelcomeScreen.module.css`.

- `2025-10-02`
  Wrong: Production deployment stripped welcome-screen CSS, misrouted static assets, and broke the Vite/Vercel setup.
  Made right: Safelisted the required classes, fixed static-asset routing, and rolled deployment config back to a working shape.
  Evidence: `6fa12995`, `b001d619`, `97431391`, `6d5e8083`.
  Files: `config/vite.config.mjs`, `vercel.json`, `src/shared/components/WelcomeScreen/WelcomeScreen.module.css`.

- `2025-10-02`
  Wrong: Duplicate names appeared on the welcome screen because data aggregation and joins duplicated rows.
  Made right: Removed the duplicate-producing joins and refined the aggregation path so names became unique again.
  Evidence: `e557dc7a`, `d74fb5ba`, `25ec9a35`, `4c2221f2`.
  Files: `src/shared/services/tournamentService.js`.

- `2025-10-02`
  Wrong: Anonymous access to `cat_app_users` was blocked by RLS.
  Made right: Added the missing anonymous-access RLS policy for the affected table.
  Evidence: `b6773f18`.
  Files: `backend/supabase/migrations/20251003010000_fix_cat_app_users_rls.sql`.

- `2025-10-06`
  Wrong: Production served code with the wrong module-script MIME type.
  Made right: Corrected the deployment/build setup so the app was served with the expected module semantics.
  Evidence: `6c70fd44`.
  Files: `src/shared/components/NameCard/NameCard.module.css`, `src/shared/components/WelcomeScreen/WelcomeScreen.module.css`.

- `2025-10-07`
  Wrong: Welcome-screen/gallery images failed to load reliably.
  Made right: Added preloading and explicit image error handling to make the gallery degrade and recover cleanly.
  Evidence: `18bbb98f`.
  Files: `src/core/hooks/useImageGallery.js`, `src/shared/components/WelcomeScreen/WelcomeScreen.jsx`, `src/shared/components/WelcomeScreen/WelcomeScreen.module.css`, `src/shared/components/WelcomeScreen/components/CatImageGallery.jsx`.

- `2025-10-14`
  Wrong: `Login` rendered twice.
  Made right: Removed the duplicate login render path and simplified the memoized main-content selection.
  Evidence: `50bb5355`.
  Files: `src/App.jsx`.

- `2025-10-14`
  Wrong: Security scans found schema, RLS, and input-validation vulnerabilities.
  Made right: Added new roles/policies and validation constraints to close the flagged holes.
  Evidence: `ba6e2dc8`, `47b1e11f`.
  Files: `backend/supabase/migrations/20251014010000_create_user_roles_table.sql`, `backend/supabase/migrations/20251014020000_fix_cat_app_users_rls.sql`, `backend/supabase/migrations/20251014030000_add_input_validation_constraints.sql`, `backend/supabase/migrations/20251014040000_add_rls_cat_name_tables.sql`.

- `2025-10-14`
  Wrong: CSS module imports broke inside Vite config.
  Made right: Corrected the config import pathing so CSS modules resolved again during builds.
  Evidence: `59c2bfac`.
  Files: `vite.config.js`, `vite.config.mjs`.

- `2025-10-14`
  Wrong: The app hit backend connection errors against Supabase.
  Made right: Repaired client/config coordination so backend connections could initialize successfully again.
  Evidence: `6438fb4a`.
  Files: `src/integrations/supabase/client.ts`, `supabase/config.toml`.

- `2025-10-15` to `2025-10-16`
  Wrong: Deployment drift piled up into broken package versions, lazy-client initialization failures, asset/MIME issues, bad rewrites, and Vite config resolution errors.
  Made right: Normalized dependency versions, fixed lazy initialization, and corrected Vercel/Vite routing and MIME handling until deployment stabilized.
  Evidence: `b13d7a43`, `46bcb140`, `3c595cb7`, `9d838121`, `1cfe9f7c`, `99a0ec00`, `88e39dcf`.
  Files: `backend/api/supabaseClient.js`, `index.html`, `vercel.json`, `vite.config.ts`.

- `2025-10-17`
  Wrong: Missing Supabase RPCs broke user-role checks.
  Made right: Added fallback handling for absent RPCs so role checks no longer crashed or hard-failed.
  Evidence: `b2520348`.
  Files: `src/core/hooks/useUserSession.js`, `src/shared/utils/authUtils.js`.

- `2025-10-17`
  Wrong: Login could fail because initialization context was missing.
  Made right: Guarded the login path against missing initialization context.
  Evidence: `237c49b4`.
  Files: `src/core/hooks/useUserSession.js`.

- `2025-10-17`
  Wrong: Analytics import wiring was wrong enough to require the React analytics entrypoint explicitly.
  Made right: Switched to the correct analytics entrypoint used by the React app.
  Evidence: `210514a3`.
  Files: `src/index.jsx`.

- `2025-10-17`
  Wrong: `ViewRouter` had a circular dependency.
  Made right: Broke the circular import path so the router component could initialize cleanly.
  Evidence: `5d2a1994`.
  Files: `src/shared/components/ViewRouter/ViewRouter.jsx`.

- `2025-10-17`
  Wrong: The error component hit an initialization name conflict and `ReferenceError`.
  Made right: Renamed or separated the conflicting initialization path so the component could load without self-collision.
  Evidence: `b0cc9e36`, `351379c0`.
  Files: `src/shared/components/Error/Error.jsx`.

- `2025-10-19`
  Wrong: Preview crashed because of a circular session-hook import.
  Made right: Removed the circular session-hook reference from the preview path.
  Evidence: `cae31226`.
  Files: `src/core/hooks/useTournament.js`.

- `2025-10-19`
  Wrong: Production preview suffered a minification regression.
  Made right: Adjusted build settings so minified preview output no longer broke at runtime.
  Evidence: `126fb0a6`.
  Files: `package-lock.json`, `vite.config.ts`.

- `2025-10-19`
  Wrong: Theme initialization regressed badly enough to need dedicated regression tests.
  Made right: Fixed the initialization flow and locked the behavior down with tests.
  Evidence: `858539c8`.
  Files: `src/core/store/useAppStore.js`, `src/core/store/useAppStore.test.jsx`.

- `2025-10-20`
  Wrong: Shared component exports triggered TDZ errors.
  Made right: Reordered or simplified exports so initialization no longer touched values before definition.
  Evidence: `35d342f0`.
  Files: `src/shared/components/index.js`.

- `2025-10-21` to `2025-10-22`
  Wrong: Circular dependencies and aggressive Vite optimization broke startup, minification, chunking, and sidebar/login visibility.
  Made right: Removed the unstable import cycles and backed off problematic compression/chunking/minification settings until startup became reliable again.
  Evidence: `af5478c1`, `8d8d463d`, `6d26ca0b`, `a55d0627`, `e75e175c`, `95826489`.
  Files: `backend/api/catNamesAPI.js`, `backend/api/hiddenNamesAPI.js`, `backend/api/imagesAPI.js`, `backend/api/supabaseClient.js`, `vite.config.ts`, `src/shared/components/AppSidebar/AppSidebar.jsx`, `src/shared/components/AppSidebar/AppSidebar.css`, `src/features/auth/Login.module.css`.

- `2025-10-22`
  Wrong: `vercel.json` still routed traffic incorrectly and needed rewrites.
  Made right: Replaced the failing route configuration with working rewrites.
  Evidence: `e4e806a6`.
  Files: `vercel.json`.

- `2025-10-26`
  Wrong: The test runner assumed `vitest` existed and failed when it did not.
  Made right: Made the test runner resilient to missing local `vitest` installs.
  Evidence: `ce3ddc84`.
  Files: `scripts/test-runner.mjs`, `package-lock.json`, `backend/api/hiddenNamesAPI.js`.

- `2025-10-29`
  Wrong: Name-visibility actions were not properly restricted to admins.
  Made right: Tightened the visibility-action checks so only admins could trigger them.
  Evidence: `f33f346a`, `2925287d`.
  Files: `backend/api/supabaseClient.js`, `src/features/profile/Profile.jsx`, `src/features/profile/ProfileNameList.jsx`.

- `2025-11-03`
  Wrong: Backend data visibility broke under policy/schema changes.
  Made right: Adjusted the relevant Supabase migration and visibility policy so the data became readable again.
  Evidence: `e2c650aa`.
  Files: `supabase/migrations/20251103033441_bad2a054-93fa-4fae-b9f4-24437e658dfa.sql`.

- `2025-11-03` to `2025-11-04`
  Wrong: Navbar sizing, preview display, Vite config, centering, and tournament-setup behavior all regressed together.
  Made right: Reworked the layout and config edges until the navbar, preview, centering, and setup screens all rendered correctly again.
  Evidence: `774c894b`, `315afc9e`, `d3bca27e`, `d0025e52`, `87862a6b`.
  Files: `src/shared/components/AppSidebar/AppSidebar.css`, `src/shared/components/ui/sidebar.css`, `vite.config.ts`.

- `2025-11-05`
  Wrong: Supabase connection failures lacked proper retry and error handling.
  Made right: Added connection-specific retry and error utilities so failures surfaced cleanly and recovered when possible.
  Evidence: `a5863b67`.
  Files: `src/integrations/supabase/client.ts`, `src/shared/utils/supabaseErrorHandler.js`, `src/shared/utils/supabaseRetry.js`.

- `2025-11-07`
  Wrong: Shared component exports hit an unexpected identifier error.
  Made right: Corrected the broken export chain so the shared component index parsed and loaded again.
  Evidence: `e1deaa0b`.
  Files: `src/shared/components/index.js`.

- `2025-11-07`
  Wrong: React hook usage regressed during config and dependency churn.
  Made right: Repaired the affected hook/config wiring so hooks stopped failing at runtime.
  Evidence: `18fdfa9d`.
  Files: `config/vite.config.ts`, `src/integrations/supabase/client.ts`, `vite.config.ts`.

- `2025-11-12`
  Wrong: Backend env loading broke client initialization, and visibility chrome still needed restoration.
  Made right: Fixed env loading for the isolated Supabase client and restored the missing navbar/sidebar visibility path.
  Evidence: `ff2d761d`, `d18704e4`, `5f8eac6c`.
  Files: `backend/api/supabaseClientIsolated.js`, `src/integrations/supabase/client.ts`.

- `2025-11-14`
  Wrong: CSS module composition failed on pseudo-class selectors.
  Made right: Changed the composition pattern so the pseudo-class selector no longer broke module processing.
  Evidence: `9f222e02`.
  Files: `src/features/tournament/TournamentSetup.module.css`.

- `2025-11-14`
  Wrong: Error logging collapsed real objects into `[object Object]`.
  Made right: Logged real error details instead of stringifying complex objects blindly.
  Evidence: `52ce81ab`.
  Files: `src/core/hooks/useUserSession.js`, `src/features/home/CatNameBanner.jsx`.

- `2025-11-15`
  Wrong: A backend table-name mismatch broke `catNamesAPI`.
  Made right: Corrected the API to query the actual table name in use.
  Evidence: `886d3f89`.
  Files: `backend/api/catNamesAPI.js`.

- `2025-11-15`
  Wrong: CSP and Supabase RLS blocked login/write flows, including explicit row-level-security failures and later `401` upsert failures.
  Made right: Relaxed the overly strict CSP where needed and corrected the RLS/user-context path used by writes.
  Evidence: `dd705df4`, `5009e5cf`, `72144716`, `77233d0b`, `44817ac1`.
  Files: `vercel.json`, `supabase/migrations/20251103033441_bad2a054-93fa-4fae-b9f4-24437e658dfa.sql`, `backend/supabase/migrations/20251114191400_add_create_user_account_function.sql`, `backend/api/supabaseClient.js`, `src/shared/services/supabase/legacy/supabaseClient.js`.

- `2025-11-15`
  Wrong: The fallback data path could crash tournament UI.
  Made right: Hardened the fallback data path so the UI could render safely when primary data was absent.
  Evidence: `afce3a0b`.
  Files: `src/App.test.jsx`, `src/features/tournament/components/NameSelection/NameSelection.jsx`.

- `2025-11-22`
  Wrong: React 19 compatibility broke the postbuild glob fix-up path.
  Made right: Updated the glob and postbuild fix logic to match the React 19 build output.
  Evidence: `76f0feab`.
  Files: `scripts/postbuild-fix-react.js`.

- `2025-11-24`
  Wrong: Manual chunk splitting and related React 19 debug config were still destabilizing builds.
  Made right: Disabled or simplified the unstable chunking/debug setup until builds became predictable again.
  Evidence: `e4f280c7`.
  Files: `config/vite.config.ts`.

- `2025-12-08`
  Wrong: Production activity crashed because of the React DevTools stub.
  Made right: Locked the production stub behavior so activity rendering stopped tripping over DevTools assumptions.
  Evidence: `7341b5e7`.
  Files: `index.html`.

- `2025-12-10`
  Wrong: Login art clipped the cat tail.
  Made right: Adjusted the login layout and styling so the illustration fit inside its container.
  Evidence: `3945d814`, `835bf6e2`.
  Files: `src/features/auth/Login.module.css`.

- `2025-12-12`
  Wrong: Rating math let `matchesPlayed` exceed sane bounds.
  Made right: Clamped `matchesPlayed` to `maxMatches` and added tests to lock the rule in place.
  Evidence: `ebaca75c`.
  Files: `src/shared/utils/tournamentUtils.js`, `src/shared/utils/tournamentUtils.test.jsx`.

- `2025-12-16`
  Wrong: Cleanup removed essential hooks, config, and test setup.
  Made right: Restored the deleted hooks/config/test files that cleanup had removed too aggressively.
  Evidence: `7faf8fe2`, `62d98017`, `af966cbd`.
  Files: `config/vite.config.ts`, `src/App.test.tsx`, `src/core/hooks/useBongoCat.ts`, `src/core/hooks/useLocalStorage.ts`.

## 2026

- `2026-01-02`
  Wrong: SEO image paths were broken.
  Made right: Corrected the SEO image references to point at the actual served assets.
  Evidence: `9847df3b`.
  Files: `index.html`, `src/integrations/supabase/types.ts`.

- `2026-01-02`
  Wrong: React dependencies required security patching for XSS-related risk.
  Made right: Upgraded the vulnerable React path to the patched release.
  Evidence: `625feb6c`, `2095d5d1`.
  Files: `package.json`, `package-lock.json`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `supabase/migrations/20260103035951_c782f06a-3a43-4599-8c59-4bac555b3f30.sql`.

- `2026-01-06`
  Wrong: `ErrorBoundary` had an `instanceof` bug.
  Made right: Corrected the type-checking path so the boundary could classify thrown errors correctly again.
  Evidence: `8563b98a`.
  Files: `src/shared/components/CommonUI.tsx`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `vite.config.ts`.

- `2026-01-06`
  Wrong: `ToastProvider` context wiring broke.
  Made right: Restored the provider/context relationship so toast consumers were mounted under a valid provider again.
  Evidence: `74fa0a44`.
  Files: `src/App.tsx`.

- `2026-01-07`
  Wrong: CSS variables in media queries caused build warnings and layout problems.
  Made right: Replaced the problematic variables with literal values in the affected media queries.
  Evidence: `cea3724a`.
  Files: `src/features/tournament/styles/SetupCards.module.css`, `src/shared/components/AppNavbar/AppNavbar.css`.

- `2026-01-08`
  Wrong: Vite stopped loading `.env` values correctly.
  Made right: Re-enabled `.env` loading in Vite config.
  Evidence: `2aafbf01`.
  Files: `vite.config.ts`.

- `2026-01-10`
  Wrong: React runtime/context wiring broke in several ways at once: `useRef` was undefined in some hooks, `BrowserRouter` was missing, and navigation hooks ran outside router context.
  Made right: Added the missing router/provider setup and explicit imports, then hardened navigation against missing context.
  Evidence: `ae14b1ae`, `8dfd4837`, `7fd37145`, `6e2d743d`, `beff3bb4`, `a895e79d`, `5930a83f`.
  Files: `src/features/tournament/hooks/useTournamentSelectionSaver.ts`, `src/shared/components/NameManagementView/shared/useNameSelection.ts`, `src/main.tsx`, `src/shared/components/NameManagementView/nameManagementCore.tsx`, `src/shared/components/TabContainer.tsx`, `src/shared/components/Toast.tsx`, `src/App.tsx`.

- `2026-01-10`
  Wrong: `App.module.css` was missing.
  Made right: Restored the missing stylesheet.
  Evidence: `c410d193`.
  Files: `src/App.module.css`.

- `2026-01-15`
  Wrong: Repository consolidation broke import paths, entry points, CSS-module paths, and large parts of TypeScript compilation.
  Made right: Walked the repo back into a coherent state by restoring imports, fixing entry points, and repairing CSS-module and TS references.
  Evidence: `868bf1ba`, `8783df57`, `c5b860b6`, `20d4c3ff`, `15ccb8e6`.
  Files: `source/App.tsx`, `source/core/hooks/tournamentHooks.ts`, `source/features/analytics/analyticsService.ts`, `source/features/explore/Explore.tsx`, `index.html`.

- `2026-01-19`
  Wrong: Rebase fallout introduced TS module errors, duplicate config keys, a missing navbar avatar, and bundling/exports failures.
  Made right: Repaired the merge damage by cleaning duplicate keys, restoring the avatar path, and simplifying the bundling configuration.
  Evidence: `91109567`, `175a1a10`, `075ee341`, `3491bf70`, `4f781215`.
  Files: `README.md`, `biome.json`, `docs/README.md`, `config/tailwind.config.js`, `config/tsconfig.json`, `source/shared/components/Navigation/AdaptiveNav.tsx`, `source/shared/components/PageTransition.tsx`, `vite.config.ts`.

- `2026-01-21`
  Wrong: Toast-provider/port coordination and CSS keyframe syntax both needed repair.
  Made right: Fixed the port/provider setup and corrected invalid keyframe syntax.
  Evidence: `a6d07273`, `f1de77e8`.
  Files: `source/shared/providers/ToastProvider.tsx`, `source/shared/styles/animations/animations.css`, `vite.config.ts`.

- `2026-01-22`
  Wrong: Vercel deployment regressed again with missing CSS imports, wrong function runtime format, backend table-name mismatches, and invalid JSON comments.
  Made right: Removed bad imports, fixed runtime metadata, corrected backend table references, and cleaned the invalid `vercel.json` syntax.
  Evidence: `7ed9e8f4`, `a1e21e82`, `83bd30b3`, `f7e8df6b`, `f11cddf5`.
  Files: `source/features/tournament/Tournament.tsx`, `source/styles/index.css`, `vercel.json`, `source/features/auth/adminService.ts`, `source/features/analytics/analyticsService.ts`, `source/utils/ui.ts`.

- `2026-01-25`
  Wrong: Sound preloading caused noisy `404` failures.
  Made right: Disabled sound preloading so missing assets stopped producing runtime noise.
  Evidence: `e4d7c3a0`.
  Files: `source/utils/ui.ts`.

- `2026-02-02`
  Wrong: Auth queries retried or failed without enough error handling.
  Made right: Added error handling and disabled unhelpful retry behavior for the failing auth query.
  Evidence: `8d7f14d4`.
  Files: `source/providers/AuthProvider.tsx`.

- `2026-02-04`
  Wrong: Asset `404`s and service-worker cache conflicts surfaced together.
  Made right: Reduced the bad asset lookups and cleaned up the cache interaction that was preserving stale paths.
  Evidence: `1630ae10`.
  Files: `config/vite.config.ts`, `source/features/tournament/components/CatImage.tsx`.

- `2026-02-05`
  Wrong: CI failed because the workflow referenced a missing script.
  Made right: Removed the nonexistent script check from CI.
  Evidence: `c747af01`.
  Files: `.github/workflows/ci.yml`.

- `2026-02-13`
  Wrong: Merge-heavy integration caused a CI meltdown: missing `pnpm-lock.yaml`, XSS in `LightBoxImage`, unsupported `packageManager` in `vercel.json`, leftover conflict markers, and tournament/dashboard bugs.
  Made right: Restored the lockfile, patched the XSS path, removed unsupported Vercel config, cleaned conflict markers, and repaired the broken tournament/dashboard files.
  Evidence: `be0aced5`, `cdb39396`, `8ed8909e`, `17fd9663`, `7a61b681`, `54346dc2`.
  Files: `pnpm-lock.yaml`, `src/App.tsx`, `src/features/analytics/Dashboard.tsx`, `src/features/tournament/Tournament.tsx`, `vercel.json`, `src/layout/FluidNav.tsx`.

- `2026-02-14`
  Wrong: Tournament export allowed CSV formula injection.
  Made right: Sanitized exported cells so spreadsheet formula execution could not be triggered by user content.
  Evidence: `58d6d15c`.
  Files: `src/utils/csvHelpers.ts`, `src/utils/csvHelpers.test.ts`, `src/features/admin/AdminDashboard.tsx`, `src/features/tournament/components/NameSelector.tsx`.

- `2026-02-17`
  Wrong: Refactor fallout broke runtime exports and tournament state plumbing with missing hooks, invalid references, hidden-names exports, and names-cache persistence issues.
  Made right: Restored the missing exports, removed invalid references, and reconnected the cache/state plumbing.
  Evidence: `f1697a73`, `d15c5fa3`, `651dc122`, `8d9a68cc`, `565bfd12`.
  Files: `src/features/tournament/hooks/useTournament.ts`, `src/app/App.tsx`, `src/hooks/useNamesCache.ts`, `src/services/supabase/api.ts`.

- `2026-02-18`
  Wrong: Tournament UI and security regressed together: mobile head-to-head layout issues, case-collision path risks, missing auth on sensitive endpoints, broken lockfile state, and `visibleNames` resets.
  Made right: Fixed the mobile layout, added path-collision protection, restored authentication on sensitive endpoints, repaired the lockfile, and stabilized `visibleNames`.
  Evidence: `9c08c0bd`, `6f3b210f`, `580c9f94`, `2059d27c`, `725742d4`.
  Files: `src/features/tournament/Tournament.tsx`, `server/auth.ts`, `server/routes.ts`, `pnpm-lock.yaml`.

- `2026-02-19`
  Wrong: Lockfile duplication errors dominated CI after merges.
  Made right: Re-generated the broken `pnpm-lock.yaml` until it matched the package graph and stopped producing duplicate-key failures.
  Evidence: `366ecd30`, `f109aef7`, `867dd99d`, `0ef4de7a`.
  Files: `pnpm-lock.yaml`.

- `2026-02-19`
  Wrong: Server hardening followed several data-integrity problems: mass assignment, loose provenance validation, schema loss, and N+1 insert behavior.
  Made right: Tightened input validation, restored schema definitions, and batched inserts to remove the unsafe or inefficient paths.
  Evidence: `517c0a72`, `abff802f`, `9636bf06`, `8100d175`, `2ddf3c02`, `3af09bc4`.
  Files: `server/routes.ts`, `server/validation.ts`, `shared/schema.ts`.

- `2026-02-20` to `2026-02-24`
  Wrong: Analytics endpoints had a real DoS risk and weak input bounds.
  Made right: Clamped the dangerous query limits and hardened the affected analytics inputs.
  Evidence: `31b8ffae`, `30a7cbc6`, `940a2e6a`, `9d5adf18`.
  Files: `server/routes.ts`, `server/routes.test.ts`, `server/routes.security.test.ts`, `src/features/analytics/analyticsHooks.ts`.

- `2026-02-22`
  Wrong: One concentrated repair batch had to clean up seven separate bugs across client, server, and the ELO engine.
  Made right: Applied a multi-surface stabilization pass across server routing, validation, and tournament logic.
  Evidence: `4c22dc51`.
  Files: `server/index.ts`, `server/routes.ts`, `server/validation.ts`, `src/services/tournament.ts`.

- `2026-02-25`
  Wrong: Initialization and tournament-state restoration both regressed, and Vercel also failed to resolve one production import cleanly.
  Made right: Added the missing browser polyfill, unified tournament-hook restoration, and fixed the production import extension.
  Evidence: `acd40fe4`, `fe379f7d`, `aea1ec35`.
  Files: `src/app/main.tsx`, `src/polyfills.ts`, `src/features/tournament/Tournament.tsx`, `src/features/tournament/components/SwipeableCards.tsx`, `src/features/tournament/components/NameSelector.tsx`.

- `2026-02-26`
  Wrong: Tournament cards could render with no names.
  Made right: Repaired the card data/render path so names appeared on the tournament cards again.
  Evidence: `d9ef0ddd`.
  Files: not recoverable from the tree diff, but the commit message explicitly calls out tournament cards.

- `2026-03-02`
  Wrong: Moving music controls into the tournament header caused a layout regression.
  Made right: Rebalanced the header layout around the relocated controls.
  Evidence: `11c21a20`.
  Files: `src/features/tournament/Tournament.tsx`.

- `2026-03-03`
  Wrong: Server security and routing failures stacked up together: unauthenticated name submissions needed rate limiting, Vite/React `404`s surfaced, IDOR and user enumeration had to be closed, and Supabase admin-status resolution was wrong.
  Made right: Added rate limiting, corrected routing/runtime path resolution, tightened user-id exposure, and fixed the Supabase admin fallback logic.
  Evidence: `3d0d7993`, `dce0818d`, `a2df28d7`, `60f8a1c3`, `60606ed8`, `8432f6b5`.
  Files: `server/routes.ts`, `server/routes.security.test.ts`, `src/services/authAdapter.ts`, `src/services/supabase/runtime.ts`, `src/services/supabase/api.ts`, `package.json`, `postcss.config.js`.

- `2026-03-04`
  Wrong: Runtime plumbing still broke in edge cases: `null.stack` crashed the console-forwarding plugin, theme/background/loading flows were unstable, and rating submission still lacked auth.
  Made right: Guarded the console-forwarding path, stabilized the affected UI flows, and enforced authentication on rating submission.
  Evidence: `3167e849`, `ecf33f56`, `a84eee3a`, `e3737e43`, `a7a91ee4`.
  Files: `scripts/vite-console-forward-plugin.ts`, `server/auth.ts`, `server/index.ts`, `server/routes.analytics.test.ts`, `src/features/analytics/analyticsHooks.ts`, `src/features/tournament/Tournament.tsx`.

- `2026-03-05`
  Wrong: Lockfile drift and a Supabase runtime bug both needed repair.
  Made right: Repaired the lockfile state and updated `@supabase/supabase-js` to clear the runtime failure.
  Evidence: `1eed9e37`, `f0b69758`.
  Files: `pnpm-lock.yaml`.

- `2026-03-06`
  Wrong: Revoking anonymous access forced another auth cleanup pass, including anon-key fallback handling.
  Made right: Reworked the auth fallback path so the app no longer depended on the revoked anonymous-access behavior.
  Evidence: `4eb83d02`, `0d79e010`, `54e1e10c`.
  Files: `src/services/authAdapter.ts`, `src/services/supabase/runtime.ts`, `src/services/supabase/api.ts`, `src/integrations/supabase/types.ts`, `supabase/migrations/20260306003402_54d4a0ed-6231-44ed-a40e-51c5f9f029dd.sql`, `supabase/migrations/20260306005208_8a102980-319b-4420-b3ce-055bb081cb39.sql`.

- `2026-03-07`
  Wrong: Styling regressions, layout spacing regressions, and a names API `500` error all landed in the same stabilization wave.
  Made right: Restored the broken styles/layout spacing and fixed the names API path that was returning `500`.
  Evidence: `63aa045d`, `53f5591b`, `c6f5da13`.
  Files: `src/shared/components/layout/FloatingNavbar.tsx`, `src/styles/layout.css`, `src/app/providers/Providers.tsx`, `src/features/tournament/components/NameSelector.tsx`, `src/features/tournament/hooks/useNameSelectorAdminActions.ts`.

- `2026-03-09`
  Wrong: Branch-wide remote merges left the repo unstable enough to need a dedicated stabilization commit.
  Made right: Applied a general merge-cleanup pass to restore a coherent post-merge state.
  Evidence: `61a2c6c3`.
  Files: `server/routes.ts`, `server/routes.security.test.ts`, `src/features/tournament/components/NameSuggestion.tsx`, `src/services/SyncQueue.test.ts`.

- `2026-03-12`
  Wrong: Tournament layout overflow still needed adjustment.
  Made right: Tightened the tournament layout and typography/token sizing to stop the remaining overflow.
  Evidence: `59cb478f`.
  Files: `src/features/tournament/Tournament.tsx`, `src/styles/tokens.css`, `src/styles/typography.css`.
