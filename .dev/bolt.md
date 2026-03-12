# Bolt's Journal

## 2024-05-22 - [Refactoring useMagneticPull]

**Learning:** React effects that add/remove global event listeners (like on `document`) based on rapidly changing state (like `isProcessing`) cause unnecessary overhead and layout thrashing.
**Action:** Use `useRef` to track the enabled state inside the event handlers/loop, and only set up/tear down listeners when the component mounts/unmounts. Use a separate `useEffect` for state-dependent cleanup (like resetting transforms).
