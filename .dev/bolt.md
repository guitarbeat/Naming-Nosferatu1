# Bolt's Journal

## 2026-03-12 - [Code Quality & Documentation Improvements]

**Actions Taken:**
- Removed unused Capacitor dependencies (@capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios)
- Removed unused dev dependency (@dyad-sh/react-vite-component-tagger)
- Cleaned up redundant comments in integration service files
- Added TODO for reference file tracking in rollback functionality
- Updated DEPLOYMENT.md with admin role detection documentation
- Added 14-day activity trend feature documentation
- Documented platform support changes (web-first, removed native mobile)

**Learning:** Regular dependency audits prevent bloat. Use `pnpm run check:deps` to identify unused packages. Comments should add value - remove redundant ones, convert implementation notes to TODOs.

## 2024-05-22 - [Refactoring useMagneticPull]

**Learning:** React effects that add/remove global event listeners (like on `document`) based on rapidly changing state (like `isProcessing`) cause unnecessary overhead and layout thrashing.
**Action:** Use `useRef` to track the enabled state inside the event handlers/loop, and only set up/tear down listeners when the component mounts/unmounts. Use a separate `useEffect` for state-dependent cleanup (like resetting transforms).

## 2024-05-23 - Optimized Masonry Layout Ref Iteration
**Learning:** Storing refs in a `useRef<Array>` for a dynamic list results in the array growing indefinitely or containing stale nulls if not managed. Iterating this entire array for layout calculations is O(total_history), not O(visible).
**Action:** When using refs for layout, loop only up to `visibleItemCount` or explicitly maintain the ref array to match the render list.

## 2024-05-24 - Memoization of Pure Functions
**Learning:** Pure functions returning new array references (like `.filter()`) should be memoized in React components if passed as props or dependencies to hooks, even if the computation is cheap, to prevent cascading re-renders and effect triggers.
**Action:** Always check function returns used in dependency arrays.
