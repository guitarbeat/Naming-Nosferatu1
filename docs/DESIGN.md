# Design System & UI/UX

**Last Updated:** March 21, 2026
**Status:** Primary Reference for Visual Design & Usability

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Glass Surfaces](#2-glass-surfaces)
3. [Component Tokens](#3-component-tokens)
4. [Theming](#4-theming)
5. [Accessibility](#5-accessibility)
6. [Liquid Glass Component](#6-liquid-glass-component)
7. [Usability & Onboarding](#7-usability--onboarding)
8. [Best Practices](#8-best-practices)
9. [SCSS File Organization & Import Chain](#9-scss-file-organization--import-chain)

---

## 1. Design Tokens

All design tokens are defined in `src/styles/tokens.scss`. Use these tokens instead of hardcoded values.

### Spacing System

Base unit: 4px. Use semantic spacing tokens for consistent rhythm.

| Token        | Value   | Pixels | Usage             |
| ------------ | ------- | ------ | ----------------- |
| `--space-0`  | 0       | 0px    | No spacing        |
| `--space-1`  | 0.25rem | 4px    | Tight spacing     |
| `--space-2`  | 0.5rem  | 8px    | Small gaps        |
| `--space-3`  | 0.75rem | 12px   | Component padding |
| `--space-4`  | 1rem    | 16px   | Standard spacing  |
| `--space-5`  | 1.25rem | 20px   | Medium spacing    |
| `--space-6`  | 1.5rem  | 24px   | Section gaps      |
| `--space-8`  | 2rem    | 32px   | Large spacing     |
| `--space-10` | 2.5rem  | 40px   | Extra large       |
| `--space-12` | 3rem    | 48px   | Section padding   |
| `--space-16` | 4rem    | 64px   | Page sections     |
| `--space-20` | 5rem    | 80px   | Hero spacing      |
| `--space-24` | 6rem    | 96px   | Major sections    |

### Typography System

| Token          | Value            | Usage     |
| -------------- | ---------------- | --------- |
| `--font-sans`  | Inter, system-ui | Body text |
| `--font-serif` | Playfair Display | Headings  |
| `--font-mono`  | JetBrains Mono   | Code      |

**Font Sizes:**

| Token         | Value    | Pixels |
| ------------- | -------- | ------ |
| `--text-xs`   | 0.75rem  | 12px   |
| `--text-sm`   | 0.875rem | 14px   |
| `--text-base` | 1rem     | 16px   |
| `--text-lg`   | 1.125rem | 18px   |
| `--text-xl`   | 1.25rem  | 20px   |
| `--text-2xl`  | 1.5rem   | 24px   |
| `--text-3xl`  | 1.875rem | 30px   |
| `--text-4xl`  | 2.25rem  | 36px   |
| `--text-5xl`  | 3rem     | 48px   |

### Color System

**Brand Colors** (use sparingly for emphasis):

| Token               | Value   | Usage            |
| ------------------- | ------- | ---------------- |
| `--color-neon-cyan` | #2ff3e0 | Primary accent   |
| `--color-hot-pink`  | #fa26a0 | Secondary accent |
| `--color-fire-red`  | #f51720 | Danger/emphasis  |

**Semantic Colors:**

| Token             | Value   | Usage          |
| ----------------- | ------- | -------------- |
| `--color-success` | #10b981 | Success states |
| `--color-error`   | #ef4444 | Error states   |
| `--color-warning` | #f59e0b | Warning states |
| `--color-info`    | #3b82f6 | Info states    |

### Border Radius

| Token           | Value          | Usage           |
| --------------- | -------------- | --------------- |
| `--radius-sm`   | 0.375rem (6px) | Small elements  |
| `--radius-md`   | 0.5rem (8px)   | Buttons, inputs |
| `--radius-lg`   | 0.75rem (12px) | Cards           |
| `--radius-xl`   | 1rem (16px)    | Large cards     |
| `--radius-2xl`  | 1.5rem (24px)  | Modals          |
| `--radius-full` | 9999px         | Pills, avatars  |

---

## 2. Glass Surfaces

Glassmorphism effects using backdrop blur, semi-transparent backgrounds, and subtle borders.

### Glass Presets

**Glass Light** - Subtle background effect:
```css
.glass-light {
  background: var(--glass-bg-light);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
}
```

**Glass Medium** - Standard glassmorphism:
```css
.glass-medium {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

**Glass Strong** - Prominent glass effect:
```css
.glass-strong {
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--glass-blur-strong));
  border: 1px solid var(--glass-border-hover);
  box-shadow: var(--glass-shadow-colored);
}
```

---

## 3. Component Tokens

### Button Tokens

| Token                       | Value                | Usage           |
| --------------------------- | -------------------- | --------------- |
| `--button-base-height`      | 48px                 | Standard button |
| `--button-height-sm`        | 32px                 | Small button    |
| `--button-height-md`        | 40px                 | Medium button   |
| `--button-height-lg`        | 48px                 | Large button    |
| `--button-border-radius`    | var(--radius-button) | Rounded corners |

### Card Tokens

| Token                         | Value              | Usage           |
| ----------------------------- | ------------------ | --------------- |
| `--card-padding-sm`           | var(--space-3)     | Small cards     |
| `--card-padding-md`           | var(--space-4)     | Standard cards  |
| `--card-padding-lg`           | var(--space-6)     | Large cards     |
| `--card-border-radius`        | var(--radius-card) | Standard radius |

---

## 4. Theming

The theme system uses CSS custom properties with `data-theme` attributes.

### Light Theme
Set with `data-theme="light"` on the root element.

### Dark Theme
Set with `data-theme="dark"` on the root element.

### High Contrast Mode
Automatically activated via `@media (prefers-contrast: more)`.

---

## 5. Accessibility

### Focus States
All interactive elements must have visible focus states using the `--focus-ring` token.

### Touch Targets
All interactive elements must have a minimum touch target of 48×48px.

### Reduced Motion
Respect user preferences for reduced motion.

---

## 6. Liquid Glass Component

A specialized React component (`src/shared/components/layout/LiquidGlass.tsx`) that creates fluid refraction effects via SVG displacement maps, with shared styling in `src/styles/liquid-glass.scss`.

---

## 7. Usability & Onboarding

### User Journey Onboarding
We focus on "Progressive Disclosure"—only showing complexity when the user is ready.

- **First-Match Tutorial**: Small overlay explaining "Click to vote, ↑ for both, ↓ to skip."
- **Progress Counter**: Clear "{x} of {n} names selected" messaging during setup.
- **Milestone Celebrations**: Visual cues at 50% and 80% tournament completion.

### Copy Guidelines
- **Avoid cold/technical language**: "Operator Identity" → "Your Name"
- **Use warm greetings**: "Welcome! Let's find the perfect name for your cat 🐱"

---

## 8. Best Practices

### Layered Global SCSS
Keep shared styles in `src/styles/*.scss` and wire them through `src/styles/index.scss` in the documented order.

### Component-Specific SCSS
Use co-located `.scss` files only when a component needs isolated styling that is not reusable globally (example: `src/shared/components/layout/FancyButton.scss` imported by `Button.tsx`).

### Avoid Inline Styles
Use CSS custom properties for dynamic values.

### Responsive Layouts
Use `clamp()` for values that should scale:
```css
font-size: clamp(1rem, 2vw, 1.5rem);
```

### Performance
Animate only `transform` and `opacity` to maintain 60fps.

---

## 9. SCSS File Organization & Import Chain

### File Organization

Global styles live in `src/styles/` and are split by responsibility:

| File | Responsibility |
| ---- | -------------- |
| `base.scss` | Tailwind directives only (`@tailwind base/components/utilities`) |
| `tokens.scss` | All design tokens and theme variables (CSS custom properties) |
| `reset.scss` | Reset, base element defaults, focus, and scrollbar behavior |
| `typography.scss` | Typography utility classes built on tokens |
| `layout.scss` | Layout primitives, responsive behavior, accessibility media rules |
| `components.scss` | Shared component classes and feature-level UI styling |
| `motion.scss` | Keyframes, transitions, and reduced-motion handling |
| `liquid-glass.scss` | Liquid glass visual system styles |

Entry bridge files:
- `src/app/main.tsx` imports `../index.scss`
- `src/index.scss` loads `src/styles/index.scss`

Component-level stylesheet imports:
- `src/shared/components/layout/Button.tsx` imports `./FancyButton.scss`
- `src/shared/components/layout/LiquidGradient.scss` exists, but is not part of the current runtime import chain

### Canonical Import Chain

```text
src/app/main.tsx
  -> src/index.scss
    -> src/styles/index.scss
      -> @import "tailwindcss"
      -> @include meta.load-css("./base")
      -> @include meta.load-css("./tokens")
      -> @include meta.load-css("./reset")
      -> @include meta.load-css("./typography")
      -> @include meta.load-css("./layout")
      -> @include meta.load-css("./components")
      -> @include meta.load-css("./motion")
      -> @include meta.load-css("./liquid-glass")
```

### Why Order Matters

1. Tailwind primitives load first.
2. Tokens define variables consumed by later layers.
3. Reset normalizes element defaults before utility/component styling.
4. Typography and layout establish reusable structure.
5. Components and motion build on those foundations.
6. Liquid glass effects load last to avoid accidental overrides.
