# AI Rules for This App

## Tech stack (quick overview)

- **React + TypeScript** for all UI and application code.
- **React Router** for client-side routing.
- **Tailwind CSS** for all styling (layout, spacing, colors, responsiveness).
- **shadcn/ui** components (Radix UI-based) as the default component library.
- **Radix UI primitives** are already available (used via shadcn/ui components).
- **lucide-react** for icons.
- **Vite-style React project** layout (source lives under `src/`).

## Rules (what to use for what)

### Routing
- Keep **all routes defined in `src/App.tsx`**.
- Pages must live in **`src/pages/`**.
- The default/main page is **`src/pages/Index.tsx`**.

### Components & file structure
- Reusable UI components should live in **`src/components/`**.
- Put all new application code under **`src/`** (no app code outside `src`).
- When adding a new component or feature, ensure it is **actually rendered somewhere**, typically by wiring it into **`src/pages/Index.tsx`** (or the relevant page).

### UI library usage
- Use **shadcn/ui** components first for common UI:
  - Buttons, inputs, forms, dialogs, drawers, dropdowns, tabs, tables, cards, toasts, etc.
- Do **not** modify the generated shadcn/ui component files directly. If behavior or styling needs to change beyond simple props/classes, create a wrapper component in `src/components/`.
- Use **Radix UI primitives directly only when shadcn/ui does not provide the needed component**.

### Styling
- Use **Tailwind CSS exclusively** for styling.
- Prefer composing Tailwind utility classes on shadcn/ui components rather than adding custom CSS.
- Avoid introducing new CSS frameworks or component libraries.

### Icons
- Use **`lucide-react`** for icons (import only the icons you need).

### Forms & validation
- Prefer shadcn/ui form patterns/components.
- Validate at **system boundaries** (e.g., user input) and keep internal-only code simple.

### Safety & quality
- Avoid introducing security issues (XSS, injection, unsafe `dangerouslySetInnerHTML`, etc.).
- Keep changes minimal and focused: implement only what’s requested and avoid broad refactors.
