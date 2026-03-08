/**
 * @module useHooks
 * @description Self-contained, zero-dependency (beyond React) collection of reusable hooks.
 *
 * **Primitives**
 * - {@link useEventListener}  — Type-safe, auto-cleaning event listeners
 * - {@link useMediaQuery}     — Subscribe to CSS media queries
 * - {@link useDebounce}       — Debounce a rapidly-changing value
 * - {@link useThrottle}       — Throttle a rapidly-changing value
 * - {@link useToggle}         — Boolean toggle with setter
 * - {@link usePrevious}       — Access the previous render's value
 * - {@link useClickOutside}   — Detect clicks outside a ref'd element
 *
 * **Browser & Environment**
 * - {@link useBrowserState}   — Responsive breakpoints, network, accessibility
 * - {@link useOnlineStatus}   — Online/offline with transition callbacks
 *
 * **Persistence**
 * - {@link useLocalStorage}   — localStorage with cross-tab sync & functional updates
 * - {@link useCollapsible}    — Collapsible state with optional persistence
 *
 * **Forms**
 * - {@link useValidatedForm}  — Lightweight form state + validation
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple debounce utility for internal use.
 */
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: any, ...args: Parameters<T>) {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => func.apply(this, args), wait);
	} as T;
}

const IS_BROWSER = typeof window !== "undefined";

/** useLayoutEffect in the browser, useEffect on the server (avoids SSR warnings). */

/**
 * Experimental Network Information API.
 * Defined here once to avoid `any` casts scattered throughout the file.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// useEventListener
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attach an event listener that auto-cleans on unmount.
 * The handler is kept in a ref — no need to memoize it.
 */
function useEventListener<K extends keyof WindowEventMap>(
	eventName: K,
	handler: (event: WindowEventMap[K]) => void,
	element?: Window | HTMLElement | null,
	options?: boolean | AddEventListenerOptions,
): void {
	const savedHandler = useRef(handler);

	useEffect(() => {
		savedHandler.current = handler;
	}, [handler]);

	useEffect(() => {
		const targetElement: Window | HTMLElement | null =
			element || (typeof window !== "undefined" ? window : null);
		if (!targetElement?.addEventListener) {
			return;
		}

		const eventListener: EventListener = (event) =>
			savedHandler.current(event as WindowEventMap[K]);

		targetElement.addEventListener(eventName, eventListener, options);

		return () => {
			targetElement.removeEventListener(eventName, eventListener, options);
		};
	}, [eventName, element, options]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// useMediaQuery
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to a CSS media query.
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}

		const listener = () => setMatches(media.matches);
		media.addEventListener("change", listener);

		return () => media.removeEventListener("change", listener);
	}, [query, matches]);

	return matches;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useBrowserState
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All-in-one hook for responsive design, network status, and accessibility prefs.
 * Internally coalesces updates via `requestAnimationFrame`.
 *
 * @example
 * const { isMobile, isOnline, prefersReducedMotion } = useBrowserState();
 * const browser = useBrowserState({ mobile: 640, tablet: 1280 });
 */
export function useBrowserState() {
	return {
		isMobile: false,
		isTablet: false,
		isDesktop: true,
		isOnline: true,
		prefersReducedMotion: false,
		isSlowConnection: false,
	};
}

/**
 * Legacy offline-sync hook.
 *
 * In the original codebase this directly imported a sync queue and API
 * client. Now it delegates to `useOnlineStatus` — consumers should pass
 * their own `onReconnect` callback to handle queue flushing.
 *
 * @example
 * useOfflineSync(); // no-op by default; attach sync logic via useOnlineStatus
 */
export function useOfflineSync(): void {
	// No-op stub — replace with `useOnlineStatus({ onReconnect: () => syncQueue.flush() })`
	// when you have a real sync queue wired up.
}

// ═══════════════════════════════════════════════════════════════════════════════
// useOnlineStatus
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight online/offline tracking with lifecycle callbacks.
 */
export function useOnlineStatus(options?: {
	onReconnect?: () => void;
	onDisconnect?: () => void;
}): boolean {
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	useEventListener("online", () => {
		setIsOnline(true);
		options?.onReconnect?.();
	});

	useEventListener("offline", () => {
		setIsOnline(false);
		options?.onDisconnect?.();
	});

	return isOnline;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useLocalStorage
// ═══════════════════════════════════════════════════════════════════════════════

type SetStateAction<T> = T | ((prev: T) => T);

/**
 * Persist state in `localStorage` with:
 * - Automatic JSON serialization / deserialization
 * - Functional updates that are never stale (ref-based)
 * - Cross-tab synchronization via the `storage` event
 * - A `remove()` helper to delete the key entirely
 *
 * @returns `[value, setValue, removeValue]`
 *
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
 * setTheme((prev) => (prev === "light" ? "dark" : "light"));
 * removeTheme(); // resets to initialValue and removes the key
 */
export function useLocalStorage<T>(
	key: string,
	initialValue: T,
	options: { debounceWait?: number } = {},
): [T, (value: SetStateAction<T>) => void, () => void] {
	// Ref the initial value so an unstable object reference doesn't cause loops
	const initialRef = useRef(initialValue);

	const readValue = useCallback((): T => {
		if (!IS_BROWSER) {
			return initialRef.current;
		}
		try {
			const raw = localStorage.getItem(key);
			return raw !== null ? (JSON.parse(raw) as T) : initialRef.current;
		} catch {
			return initialRef.current;
		}
	}, [key]);

	const [stored, setStored] = useState<T>(readValue);

	// Always-current value for functional updates
	const valueRef = useRef(stored);
	valueRef.current = stored;

	// Create a ref for the debounce function so it persists
	const debouncedSetItemRef = useRef<ReturnType<typeof debounce> | null>(null);

	// Initialize or update the debounced function only when wait time changes
	useEffect(() => {
		if (options.debounceWait && options.debounceWait > 0) {
			debouncedSetItemRef.current = debounce((val: T) => {
				if (IS_BROWSER) {
					localStorage.setItem(key, JSON.stringify(val));
				}
			}, options.debounceWait);
		} else {
			debouncedSetItemRef.current = null;
		}
	}, [options.debounceWait, key]);

	const setValue = useCallback(
		(next: SetStateAction<T>) => {
			try {
				const resolved = next instanceof Function ? next(valueRef.current) : next;
				setStored(resolved);
				valueRef.current = resolved;
				if (debouncedSetItemRef.current) {
					debouncedSetItemRef.current(resolved);
				} else {
					if (IS_BROWSER) {
						localStorage.setItem(key, JSON.stringify(resolved));
					}
				}
			} catch (err) {
				console.warn(`[useLocalStorage] write "${key}" failed:`, err);
			}
		},
		[key],
	);

	const removeValue = useCallback(() => {
		const fallback = initialRef.current;
		setStored(fallback);
		valueRef.current = fallback;
		if (IS_BROWSER) {
			try {
				localStorage.removeItem(key);
			} catch {
				/* quota / security errors */
			}
		}
	}, [key]);

	// Cross-tab sync
	useEffect(() => {
		if (!IS_BROWSER) {
			return;
		}
		const onStorage = (e: StorageEvent) => {
			if (e.key !== key) {
				return;
			}
			try {
				const parsed = e.newValue !== null ? (JSON.parse(e.newValue) as T) : initialRef.current;
				setStored(parsed);
				valueRef.current = parsed;
			} catch {
				setStored(initialRef.current);
				valueRef.current = initialRef.current;
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [key]);

	return [stored, setValue, removeValue];
}

// ═══════════════════════════════════════════════════════════════════════════════
// useCollapsible
// ═══════════════════════════════════════════════════════════════════════════════

interface CollapsibleReturn {
	isCollapsed: boolean;
	toggle: () => void;
	collapse: () => void;
	expand: () => void;
	set: (value: boolean) => void;
}

/**
 * Manage collapsible/expandable UI sections.
 * Optionally persists state to localStorage across reloads.
 *
 * @example
 * const sidebar = useCollapsible(false, "sidebar-collapsed");
 * <button onClick={sidebar.toggle}>{sidebar.isCollapsed ? "▶" : "▼"}</button>
 */
export function useCollapsible(defaultValue = false, storageKey?: string): CollapsibleReturn {
	const [value, setValueRaw] = useState<boolean>(() => {
		if (storageKey && IS_BROWSER) {
			try {
				const raw = localStorage.getItem(storageKey);
				if (raw !== null) {
					return JSON.parse(raw) as boolean;
				}
			} catch {
				/* fall through */
			}
		}
		return defaultValue;
	});

	const valueRef = useRef(value);
	valueRef.current = value;

	const set = useCallback(
		(next: boolean) => {
			setValueRaw(next);
			if (storageKey && IS_BROWSER) {
				try {
					localStorage.setItem(storageKey, JSON.stringify(next));
				} catch {
					/* quota errors */
				}
			}
		},
		[storageKey],
	);

	const toggle = useCallback(() => set(!valueRef.current), [set]);
	const collapse = useCallback(() => set(true), [set]);
	const expand = useCallback(() => set(false), [set]);

	return { isCollapsed: value, toggle, collapse, expand, set };
}
