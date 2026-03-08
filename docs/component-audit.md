# Component Audit

## Scope

Audited all React component files under `source/`, grouped by feature area (layout, analytics, tournament, app/providers). Hooks, store modules, and utility-only files were considered out of scope unless they render UI directly. This audit focuses on component responsibilities, accessibility, and potential follow-ups.

## Summary Highlights

**Strengths**
- Consistent use of `Card`, `Section`, and layout primitives to keep visual language cohesive.
- Loading and error handling patterns are centralized (`Loading`, `ErrorBoundary`, `ErrorComponent`).
- Navigation and analytics surfaces are decomposed into reusable subcomponents.

**Follow-up Opportunities**
- Add accessible labels to icon-only buttons (e.g., Lightbox controls, tournament audio toggle).
- Ensure interactive non-button elements (e.g., `CollapsibleHeader` container) have keyboard support or are rendered as `<button>` elements.
- Review setTimeout-based animation sequences in charts for cleanup on unmount.
- Consider focus trapping for modal overlays (Lightbox) to improve keyboard navigation.

## Component Inventory

### App + Routing
- **App (`source/App.tsx`)**: Application shell with router, error boundaries, and initialization state.
- **Routes (`source/routes.tsx`)**: Lazy-loaded route composition with `Section` wrappers.

### Layout Components
- **AppLayout (`source/layout/AppLayout.tsx`)**: Wraps global UI (background, nav, offline/scroll-to-top, errors).
- **Button / ScrollToTopButton (`source/layout/Button.tsx`)**: Unified button variants and scroll helper.
- **CatBackground (`source/layout/CatBackground.tsx`)**: Decorative animated star field (uses DOM APIs).
- **Charts (`source/layout/Charts.tsx`)**: Bump chart visualization with animated SVG rendering.
- **CollapsibleHeader / CollapsibleContent (`source/layout/CollapsibleHeader.tsx`)**: Expand/collapse header used in analytics.
- **EmptyState (`source/layout/EmptyState.tsx`)**: Reusable empty-state messaging block.
- **ErrorBoundary / ErrorComponent (`source/layout/Error.tsx`)**: Centralized error handling, retry, and error list UI.
- **FloatingBubbles (`source/layout/FloatingBubbles.tsx`)**: Floating avatar bubbles with physics + click actions.
- **FluidNav (`source/layout/FluidNav.tsx`)**: Main bottom navigation with state-driven actions.
- **FormPrimitives (`source/layout/FormPrimitives.tsx`)**: Form fields, validation, input + textarea primitives.
- **Lightbox (`source/layout/Lightbox.tsx`)**: Modal image viewer with keyboard controls.
- **LiquidGlass (`source/layout/LiquidGlass.tsx`)**: SVG filter-backed glass effects.
- **NavButton / AnimatedNavButton (`source/layout/NavButton.tsx`)**: Reusable navigation buttons.
- **Section (`source/layout/Section.tsx`)**: Section layout wrapper with multiple variants.
- **StatusIndicators (`source/layout/StatusIndicators.tsx`)**: Loading, offline status, performance badges, trend indicators.
- **Toast (`source/layout/Toast.tsx`)**: Toast notifications with variants.
- **Card components (`source/layout/Card/Card.tsx`, `CardName.tsx`, `CardStats.tsx`, `source/layout/Card.tsx`)**: Core card primitives and name card variant.

### Analytics Feature
- **Dashboard (`source/features/analytics/Dashboard.tsx`)**: Unified analytics dashboard with chart/table/insight views.
- **AnalysisComponents (`source/features/analytics/AnalysisComponents.tsx`)**: Panel, table, and insight tiles.
- **PersonalResults (`source/features/analytics/PersonalResults.tsx`)**: User-specific ranking summary.
- **RandomGenerator (`source/features/analytics/RandomGenerator.tsx`)**: Random name generator interface.
- **RankingAdjustment (`source/features/analytics/RankingAdjustment.tsx`)**: Admin ranking adjustment tools.

### Tournament Feature
- **Tournament (`source/features/tournament/Tournament.tsx`)**: Match flow, voting UI, and progress controls.
- **Modes (`source/features/tournament/modes/*.tsx`)**: Tournament flow, setup, and management modes.
- **Components**:
  - **BongoCat (`source/features/tournament/components/BongoCat.tsx`)**: Animated loading mascot.
  - **CatImage (`source/features/tournament/components/CatImage.tsx`)**: Image wrapper with loading/fallback handling.
  - **NameGrid (`source/features/tournament/components/NameGrid.tsx`)**: Grid of `CardName` items with lightbox support.
  - **NameSuggestion (`source/features/tournament/components/NameSuggestion.tsx`)**: Name suggestion input and list.
  - **ProfileSection (`source/features/tournament/components/ProfileSection.tsx`)**: Login/profile management area.
  - **SwipeableCards (`source/features/tournament/components/SwipeableCards.tsx`)**: Swipe UI for name selection.

### Providers
- **AuthProvider (`source/providers/AuthProvider.tsx`)**: Auth state and login flow.
- **ToastProvider (`source/providers/ToastProvider.tsx`)**: Toast state and helpers.
