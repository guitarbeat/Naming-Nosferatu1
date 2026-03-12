# Palette's Journal

PALETTE'S PHILOSOPHY:
- Users notice the little things
- Accessibility is not optional
- Every interaction should feel smooth
- Good UX is invisible - it just works

## CRITICAL LEARNINGS

## 2025-05-27 - Keyboard Accessibility for Custom Cards
**Learning:** Using `div` or generic `Card` components for primary interactions (like voting) without explicit accessibility attributes excludes keyboard users. `pointer-events-none` only blocks mouse/touch, so `tabIndex` management is crucial for disabling keyboard interaction during animations.
**Action:** When making a `div` clickable, always add `role="button"`, `tabIndex={0}` (or -1 if disabled), `aria-label`, and `onKeyDown` handler for Enter/Space keys.

## 2025-05-28 - Accessible File Inputs
**Learning:** File inputs often get styled with `display: none` to hide the default browser UI, but this removes them from the accessibility tree, preventing keyboard users from triggering the file dialog.
**Action:** Use `className="sr-only"` (or equivalent visual hiding styles) instead of `display: none`. Ensure the custom label has visible focus states (e.g., via `focus-within` on the container) so keyboard users know where they are.
