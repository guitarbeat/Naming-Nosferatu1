

## Plan: Profile as a modal/overlay triggered from navbar

### What changes

The profile section currently lives inline on the home page. Instead, it will become a slide-up panel/modal that opens when the user clicks "Profile" in the FloatingNavbar, and the inline profile section will be removed from the home page.

### Implementation

**1. Add `isProfileOpen` to UIState** (`src/shared/types/index.ts`)
- Add `isProfileOpen: boolean` to the `UIState` interface.

**2. Add toggle action to the UI slice** (`src/store/appStore.ts`)
- Initialize `isProfileOpen: false`.
- Add `toggleProfile` and `setProfileOpen` to `uiActions`.

**3. Update FloatingNavbar** (`src/shared/components/layout/FloatingNavbar.tsx`)
- Change the Profile nav item's `onClick` to call `uiActions.setProfileOpen(true)` instead of scrolling to the `#profile` section.
- Remove `"profile"` from the `NavSection` type and scroll-tracking logic since it's no longer a page section.

**4. Create a Profile overlay panel** (`src/shared/components/layout/AppLayout.tsx`)
- Render a modal/slide-up panel (using existing motion patterns) that shows `<ProfileInner>` when `ui.isProfileOpen` is true.
- Include a close button and backdrop click to dismiss.
- Positioned above the navbar with proper z-indexing.

**5. Remove inline profile section from HomeContent** (`src/app/App.tsx`)
- Delete the `<Section id="profile">` block containing `<SectionHeading>` and `<ProfileInner>`.
- Remove the `ProfileInner` import if no longer used here (it moves to AppLayout).

### Files modified
- `src/shared/types/index.ts` — add `isProfileOpen`
- `src/store/appStore.ts` — add state + actions
- `src/shared/components/layout/FloatingNavbar.tsx` — update Profile click handler, remove profile scroll tracking
- `src/shared/components/layout/AppLayout.tsx` — render profile overlay panel
- `src/app/App.tsx` — remove inline profile section

