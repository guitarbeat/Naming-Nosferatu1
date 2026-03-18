# Component Audit

**Last Reviewed:** March 15, 2026

## Scope

Audited all React component files under `src/`, grouped by feature area (layout, analytics, tournament, app/providers). Hooks, store modules, and utility-only files were considered out of scope unless they render UI directly. This audit focuses on component responsibilities, accessibility, and potential follow-ups.

## Summary Highlights

**Strengths**
- Consistent use of `Card`, `Section`, and layout primitives to keep visual language cohesive.
- Loading and error handling patterns are centralized (`Loading`, `ErrorBoundary`, `ErrorComponent`).
- Navigation and analytics surfaces are decomposed into reusable subcomponents.

**Resolved Since Initial Audit**
- Icon-only controls called out in the audit now expose accessible labels, including Lightbox controls and the tournament audio controls.
- The hidden-names disclosure trigger is a native `<button>` in `NameSelector`; `CollapsibleContent` is only the animated content wrapper.
- `Lightbox` now traps focus while open and restores focus to the originating control on close.
- Timer-based follow-ups in `RankingAdjustment` and `LightboxImage` now clear pending timers on unmount or source changes.
- `ConfirmDialog` now traps focus and returns focus to the triggering control when dismissed.

**Current Watchpoints**
- Keep modal focus-management behavior covered by tests so future visual refactors do not regress keyboard navigation.

## Component Inventory

### App + Routing
- **App (`src/app/App.tsx`)**: Application shell with route definitions, error boundaries, and initialization state.

### Layout Components
- **AppLayout (`src/shared/components/layout/AppLayout.tsx`)**: Wraps global UI (nav, offline/scroll-to-top, errors).
- **Button / ScrollToTopButton (`src/shared/components/layout/Button.tsx`)**: Unified button variants and scroll helper.
- **CollapsibleContent (`src/shared/components/layout/CollapsibleHeader.tsx`)**: Expand/collapse content wrapper.
- **ErrorBoundary / ErrorComponent (`src/shared/components/layout/Feedback/ErrorBoundary.tsx`)**: Centralized error handling and retry UI.
- **FormPrimitives (`src/shared/components/layout/FormPrimitives.tsx`)**: Form fields and textarea primitives.
- **Lightbox (`src/shared/components/layout/Lightbox.tsx`)**: Modal image viewer with keyboard controls.
- **LiquidGlass (`src/shared/components/layout/LiquidGlass.tsx`)**: SVG filter-backed glass effects.
- **Section (`src/shared/components/layout/Section.tsx`)**: Section layout wrapper with variants.
- **Loading / OfflineIndicator (`src/shared/components/layout/Feedback/`)**: Shared feedback components.
- **Card components (`src/shared/components/layout/Card/Card.tsx`)**: Core card primitives and name/stats variants.

### Analytics Feature
- **Dashboard (`src/features/analytics/Dashboard.tsx`)**: Unified analytics dashboard with chart/table/insight views.
- **PersonalResults (`src/features/analytics/PersonalResults.tsx`)**: User-specific ranking summary.
- **RandomGenerator (`src/features/tournament/components/RandomGenerator.tsx`)**: Random name generator interface.
- **RankingAdjustment (`src/features/analytics/RankingAdjustment.tsx`)**: Admin ranking adjustment tools.

### Tournament Feature
- **Tournament (`src/features/tournament/Tournament.tsx`)**: Match flow, voting UI, and progress controls.
- **Modes (`src/features/tournament/modes/*.tsx`)**: Tournament flow, setup, and management modes.
- **Components**:
  - **NameSelector (`src/features/tournament/components/NameSelector.tsx`)**: Name selection and admin controls.
  - **NameSuggestion (`src/features/tournament/components/NameSuggestion.tsx`)**: Name suggestion forms.
  - **ProfileSection (`src/features/tournament/components/ProfileSection.tsx`)**: Login/profile management area.

### Providers
- **Providers (`src/app/providers/Providers.tsx`)**: Auth context and toast context providers.
