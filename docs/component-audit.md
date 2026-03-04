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
- **Dashboard (`source/features/analytics/Dashboard.tsx`)**: Unified analytics dashboard with chart/table/insight views.
- **PersonalResults (`source/features/analytics/PersonalResults.tsx`)**: User-specific ranking summary.
- **RandomGenerator (`src/features/tournament/components/RandomGenerator.tsx`)**: Random name generator interface.
- **RankingAdjustment (`source/features/analytics/RankingAdjustment.tsx`)**: Admin ranking adjustment tools.

### Tournament Feature
- **Tournament (`source/features/tournament/Tournament.tsx`)**: Match flow, voting UI, and progress controls.
- **Modes (`source/features/tournament/modes/*.tsx`)**: Tournament flow, setup, and management modes.
- **Components**:
  - **NameSelector (`src/features/tournament/components/NameSelector.tsx`)**: Name selection and admin controls.
  - **NameSuggestion (`src/features/tournament/components/NameSuggestion.tsx`)**: Name suggestion forms.
  - **ProfileSection (`src/features/tournament/components/ProfileSection.tsx`)**: Login/profile management area.

### Providers
- **AuthProvider (`source/providers/AuthProvider.tsx`)**: Auth state and login flow.
- **ToastProvider (`source/providers/ToastProvider.tsx`)**: Toast state and helpers.
