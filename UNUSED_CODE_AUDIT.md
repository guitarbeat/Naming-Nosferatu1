# Unused Code Audit

Date: 2026-03-09  
Scope: `src/`, `server/`, `scripts/`  
Method: `knip` (project-wide + src-only), `rg` reference tracing, manual file-level verification

## How This Audit Was Performed

1. Ran default `knip` against configured app entry (`src/app/main.tsx`).
2. Ran expanded `knip` with temporary config including `src`, `server`, and `scripts` with entries:
   - `src/app/main.tsx`
   - `server/index.ts`
3. Manually verified each finding with `rg` searches for imports/usages and checked `package.json` scripts.
4. Scanned all tracked code files (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.css`) for low-reference candidates.

## High-Confidence Unused Code

These items have no in-repo runtime/test imports and no npm script wiring.

1. `src/features/tournament/hooks/useTournamentSelectionSaver.ts`
   - Exported hook is never imported.
   - Evidence: only self-references found.
   - Key lines: overloaded exports at lines 29-33.

2. `src/features/tournament/hooks/useTournamentSelectionSaver.bench.ts`
   - Benchmark file not wired into test/bench scripts.
   - Evidence: no references outside file.

3. `src/shared/components/layout/LiquidGradient.css`
   - Not imported by any TS/TSX/CSS file.
   - Current app background is driven by:
     - `src/shared/components/layout/AppLayout.tsx`
     - `src/styles/components.css`

## Likely Unused (Manual/One-off Scripts)

These are standalone scripts with no package script references. They may be intentionally kept for ad hoc local use.

1. `scripts/benchmark_insert.ts`
2. `scripts/benchmark_leaderboard.ts`
3. `scripts/benchmark_popularity.ts`
4. `scripts/benchmark-stats.ts`
5. `scripts/test-admin-functions.js`

Notes:
- `package.json` does not expose commands for these files.
- If these are still useful, move them under a documented `scripts/manual/` section and add README usage.

## Unused Exports / Types (From Knip)

These do not currently affect runtime, but they add surface area and maintenance overhead.

1. `server/db.ts:28`
   - `pool` export is unused (the `db` export is used; `pool` is not imported elsewhere).

2. `server/validation.ts:41-46`
   - Unused exported type aliases:
     - `CreateNameInput`
     - `CreateUserInput`
     - `UpdateHideInput`
     - `UpdateLockInput`
     - `BatchHideInput`
     - `SaveRatingsInput`

3. `scripts/vite-console-forward-plugin.ts:19`
   - `ConsoleForwardOptions` is exported but not imported outside the file.
   - Can be non-exported interface.

4. `src/integrations/supabase/types.ts:683-777`
   - Unused exported helper types:
     - `Tables`
     - `TablesInsert`
     - `TablesUpdate`
     - `Enums`
     - `CompositeTypes`
   - Caution: generated types may be intentionally exported for future developer ergonomics.

## Already Cleaned During This Session

1. Removed unused selectors:
   - `.cat-background__sky`
   - `.cat-background__star`
2. Removed unused animation keyframe:
   - `@keyframes twinkle`

## Recommended Removal Order

1. Remove truly orphaned source files first:
   - `useTournamentSelectionSaver.ts`
   - `useTournamentSelectionSaver.bench.ts`
   - `LiquidGradient.css`
2. Convert/remove unused exports:
   - `pool` export in `server/db.ts`
   - type exports in `server/validation.ts`
   - `ConsoleForwardOptions` export
3. Decide policy for manual scripts:
   - delete, or
   - keep but document + relocate (`scripts/manual/`).

## Validation Command After Each Cleanup

```bash
pnpm lint && pnpm test -- --run src/app/App.test.tsx src/test/features/tournament/TournamentFlow.test.tsx && pnpm build
```

## Second-Pass Scan (Likely Missed Areas)

This pass focused on areas commonly missed by import-graph tools:
- `public/` runtime assets
- service worker wiring
- CSS keyframes/utilities with no class usage
- knip false positives around framework-driven methods

### Additional High-Confidence Findings

1. `public/sw.js` appears unregistered
   - No `navigator.serviceWorker.register(...)` usage found in `src/`, `server/`, `scripts/`, or `index.html`.
   - If PWA support is not intended, this file is dead.

2. `public/assets/images/gallery.json` appears unused
   - No runtime fetch/import references found.
   - Current image sources come from `src/shared/lib/constants.ts` and direct paths in `index.html`.

3. Legacy/alternate image variants in `public/assets/images/` are likely unused
   - `.avif` variants are referenced by app constants.
   - Most `.webp` twins have zero references.
   - Additional standalone files with zero references:
     - `/assets/images/1769481846084.png`
     - `/assets/images/cat graphic HD.png`
     - `/assets/images/vibrant cat with baguettes t-shirt.png`
   - Keep only if they are intentionally manual assets.

### CSS Motion Debt (Not Runtime-Broken, But Probably Dead)

In `src/styles/motion.css`, many keyframes are defined but not wired to active class usage in the app UI:
- `bounce-subtle`
- `pulse-glow`
- `pulse-opacity`
- `gradient-shift`
- `cosmic-float`
- `cat-bounce`
- `fadeIn`
- `fadeOut`
- `glowPulse`
- `cosmicFloat`
- `trend-pulse`
- `analysis-panel-fade-in`
- `analysis-pulse`
- `analysis-selection-pulse`

Note:
- `spin` is in active use (`.animate-spin` and loader/button states).
- This section should be cleaned cautiously: some classes may be intended as design-system reserve utilities.

### Knip False-Positive Notes (Second Pass)

`knip` reported some class members as unused that are framework-driven and should not be auto-removed:
- `ErrorBoundary.getDerivedStateFromError`
- `ErrorBoundary.componentDidCatch`
- `ErrorBoundary.render`

These are React lifecycle/render methods and can be invoked implicitly by React, not explicit imports.

### Suggested Next Cleanup Batch (Missed-Area Focus)

1. Remove or document `public/sw.js`.
2. Remove or document `public/assets/images/gallery.json`.
3. Delete unreferenced duplicate image variants (mostly `.webp`) after confirming no CDN/external usage.
4. Prune `motion.css` keyframes that have no corresponding utility classes used in current components.

## Third-Pass Scan (Tool-Assisted Expansion)

This pass used additional analyzers to catch missed patterns:
- `ts-prune` for potentially unused exports
- `unimported` for unimported files/dependency hygiene
- `depcheck` for dependency/package drift
- `purgecss` for style-surface reduction signals

### Tool Output Highlights

1. `unimported` (with explicit entry points) found:
   - 17 unimported files (mostly test files + bench file)
   - 2 unused dependencies: `@types/cors`, `@types/express`

2. `ts-prune` found many exported symbols from barrel files and generated types.
   - Important caveat: it produced false positives under path aliases / runtime-loaded modules.
   - Example false positive:
     - `src/app/deployment.ts` was flagged, but is actually loaded by script tag in `index.html`:
       - `<script type="module" src="/src/app/deployment.ts"></script>`

3. `depcheck` JSON output:
   - flagged dev dependencies:
     - `@vitest/coverage-v8`, `autoprefixer`, `postcss`, `tailwindcss`
   - Confidence is mixed:
     - `@vitest/coverage-v8` appears unused in scripts (high confidence).
     - `autoprefixer` / `postcss` may be consumed implicitly by Vite/PostCSS config (medium confidence).
     - `tailwindcss` may be consumed by CSS import/toolchain even if static scan misses it (low-medium confidence).

4. `purgecss` generated reduced CSS outputs, but no explicit rejected list suited for safe automated deletion.
   - Good for directional signal only.
   - Not safe as a direct deletion source because of dynamic class generation and framework utilities.

### New Findings to Add (Post-Verification)

1. `src/app/deployment.ts` is **not** unused
   - Runtime-loaded from `index.html` via direct script tag.
   - Keep it.

2. `attached_assets/` content appears orphaned from app runtime
   - Files currently present:
     - `attached_assets/image_1772067120839.png`
     - `attached_assets/image_1771898153808.png`
     - `attached_assets/Pasted--Role-Objective-You-are-an-expert-full-stack-developer-_1771979042541.txt`
   - No references found in source/docs/config.
   - Treat as archival unless intentionally used outside repo runtime.

3. Dependency hygiene candidates
   - `@types/cors` and `@types/express` are in `dependencies` and not directly imported.
   - Recommended action: move to `devDependencies` or remove if TypeScript compile remains clean.

4. Coverage tooling candidate
   - `@vitest/coverage-v8` not used by current npm scripts (`test:coverage` currently calls `vitest --coverage` without provider-specific config).
   - Verify desired coverage provider before removal.

### Confidence Matrix (Third Pass)

High confidence:
- `attached_assets/*` orphaned from runtime
- `@types/cors`, `@types/express` should not be production dependencies

Medium confidence:
- `@vitest/coverage-v8` can be removed (if no intended provider lock-in)
- `public/sw.js` and `public/assets/images/gallery.json` unused (no wiring found)

Low/needs caution:
- Any deletion based solely on `purgecss` output
- `tailwindcss`, `postcss`, `autoprefixer` removal based only on `depcheck`
