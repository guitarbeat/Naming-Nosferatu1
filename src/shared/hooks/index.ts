/**
 * @module useHooks
 * @description Reusable hooks collection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import { matchesMediaQuery, subscribeToMediaQuery } from "@/shared/lib/mediaQuery";
import {
	getStorageString,
	parseJsonValue,
	readStorageJson,
	removeStorageItem,
	writeStorageJson,
} from "@/shared/lib/storage";
import { coreAPI, ratingsAPI } from "@/shared/services/supabase/client";
import { flushRatingsMutations } from "@/shared/services/supabase/outbox";

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple debounce utility for internal use.
 */
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: unknown, ...args: Parameters<T>) {
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
interface NetworkInformation extends EventTarget {
	effectiveType?: string;
	rtt?: number;
	downlink?: number;
	saveData?: boolean;
}

type NavigatorWithConnection = Navigator & {
	connection?: NetworkInformation;
	mozConnection?: NetworkInformation;
	webkitConnection?: NetworkInformation;
};

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

/** Subscribe to a CSS media query. */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => matchesMediaQuery(query));

	useEffect(() => {
		if (!IS_BROWSER) {
			return;
		}

		return subscribeToMediaQuery(query, setMatches);
	}, [query]);

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
function getConnectionInfo(): NetworkInformation | null {
	if (!IS_BROWSER) {
		return null;
	}
	const nav = navigator as NavigatorWithConnection;
	return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

function isSlowNetwork(connection: NetworkInformation | null): boolean {
	if (!connection) {
		return false;
	}
	const type = connection.effectiveType ?? "";
	const saveData = Boolean(connection.saveData);
	const rtt = connection.rtt ?? 0;
	const downlink = connection.downlink ?? 10;
	return type === "slow-2g" || type === "2g" || saveData || rtt > 300 || downlink < 1.5;
}

export function useBrowserState() {
	const isOnline = useOnlineStatus();
	const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
	const readViewport = useCallback(() => {
		if (!IS_BROWSER) {
			return {
				isMobile: false,
				isTablet: false,
				isDesktop: true,
			};
		}
		const width = window.innerWidth;
		return {
			isMobile: width < 768,
			isTablet: width >= 768 && width < 1024,
			isDesktop: width >= 1024,
		};
	}, []);
	const [viewport, setViewport] = useState(readViewport);
	const [isSlowConnection, setIsSlowConnection] = useState(() =>
		isSlowNetwork(getConnectionInfo()),
	);

	useEffect(() => {
		if (!IS_BROWSER) {
			return;
		}
		let rafId = 0;
		const handleResize = () => {
			if (rafId) {
				return;
			}
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				setViewport(readViewport());
			});
		};
		window.addEventListener("resize", handleResize, { passive: true });
		window.addEventListener("orientationchange", handleResize, { passive: true });
		return () => {
			if (rafId) {
				window.cancelAnimationFrame(rafId);
			}
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("orientationchange", handleResize);
		};
	}, [readViewport]);

	useEffect(() => {
		const connection = getConnectionInfo();
		if (!connection) {
			return;
		}
		const onChange = () => setIsSlowConnection(isSlowNetwork(connection));
		onChange();
		connection.addEventListener("change", onChange);
		return () => connection.removeEventListener("change", onChange);
	}, []);

	return {
		...viewport,
		isOnline,
		prefersReducedMotion,
		isSlowConnection,
	};
}

/**
 * Offline-sync hook.
 *
 * Flushes the ratings IndexedDB outbox automatically whenever the device
 * comes back online.  Uses the user name stored in localStorage as the
 * Supabase user identifier for the flush processor.
 *
 * @example
 * useOfflineSync(); // attach in App root
 */
export function useOfflineSync(): void {
	const onReconnect = useCallback(async () => {
		try {
			const userName = getStorageString(STORAGE_KEYS.USER) ?? "anonymous";
			await flushRatingsMutations(async (entry) => {
				const ratingsRecord: Record<string, { rating: number; wins: number; losses: number }> = {};
				for (const r of entry.payload.ratings) {
					ratingsRecord[r.name_id] = {
						rating: r.rating,
						wins: r.wins,
						losses: r.losses,
					};
				}
				const result = await ratingsAPI.saveRatings(userName, ratingsRecord);
				if (!result.success) {
					throw new Error("saveRatings returned failure");
				}
			});
		} catch {
			/* swallow flush errors — the outbox retains entries for next reconnect */
		}
	}, []);

	useOnlineStatus({ onReconnect });
}

// ═══════════════════════════════════════════════════════════════════════════════
// useOnlineStatus
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight online/offline tracking with lifecycle callbacks.
 */
function useOnlineStatus(options?: {
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

		const raw = getStorageString(key, null);
		return raw === null ? initialRef.current : parseJsonValue(raw, initialRef.current);
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
					writeStorageJson(key, val);
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
						writeStorageJson(key, resolved);
					}
				}
			} catch {
				/* quota / security errors */
			}
		},
		[key],
	);

	const removeValue = useCallback(() => {
		const fallback = initialRef.current;
		setStored(fallback);
		valueRef.current = fallback;
		if (IS_BROWSER) {
			removeStorageItem(key);
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
			if (e.newValue === null) {
				setStored(initialRef.current);
				valueRef.current = initialRef.current;
				return;
			}
			const parsed = parseJsonValue<T>(e.newValue, initialRef.current);
			setStored(parsed);
			valueRef.current = parsed;
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
			return readStorageJson<boolean>(storageKey, defaultValue);
		}
		return defaultValue;
	});

	const valueRef = useRef(value);
	valueRef.current = value;

	const set = useCallback(
		(next: boolean) => {
			setValueRaw(next);
			if (storageKey && IS_BROWSER) {
				writeStorageJson(storageKey, next);
			}
		},
		[storageKey],
	);

	const toggle = useCallback(() => set(!valueRef.current), [set]);
	const collapse = useCallback(() => set(true), [set]);
	const expand = useCallback(() => set(false), [set]);

	return { isCollapsed: value, toggle, collapse, expand, set };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useNameSuggestion
// ═══════════════════════════════════════════════════════════════════════════════

interface UseNameSuggestionProps {
	onSuccess?: () => void;
}

interface UseNameSuggestionResult {
	values: { name: string; description: string };
	errors: { name?: string; description?: string };
	touched: { name?: boolean; description?: boolean };
	isSubmitting: boolean;
	isValid: boolean;
	handleChange: (field: "name" | "description", value: string) => void;
	handleBlur: (field: "name" | "description") => void;
	handleSubmit: () => Promise<void>;
	reset: () => void;
	globalError: string;
	successMessage: string;
	setGlobalError: (error: string) => void;
}

export function useNameSuggestion(props: UseNameSuggestionProps = {}): UseNameSuggestionResult {
	const [values, setValues] = useState({ name: "", description: "" });
	const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
	const [touched, setTouched] = useState<{ name?: boolean; description?: boolean }>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [globalError, setGlobalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const handleChange = useCallback((field: "name" | "description", value: string) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
		setGlobalError("");
	}, []);

	const handleBlur = useCallback((field: "name" | "description") => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const validate = useCallback(() => {
		const nextErrors: { name?: string; description?: string } = {};
		if (!values.name.trim()) {
			nextErrors.name = "Name is required";
		}
		if (!values.description.trim()) {
			nextErrors.description = "Description is required";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [values]);

	const handleSubmit = useCallback(async () => {
		if (!validate()) {
			return;
		}
		setIsSubmitting(true);
		setGlobalError("");
		setSuccessMessage("");
		try {
			const result = await coreAPI.addName(values.name, values.description);
			if (!result.success) {
				throw new Error(result.error || "Failed to submit suggestion");
			}
			setSuccessMessage("Name suggestion submitted successfully!");
			setValues({ name: "", description: "" });
			setTouched({});
			props.onSuccess?.();
		} catch (submitError) {
			setGlobalError(
				submitError instanceof Error ? submitError.message : "Failed to submit suggestion",
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [props, validate, values.name, values.description]);

	const reset = useCallback(() => {
		setValues({ name: "", description: "" });
		setErrors({});
		setTouched({});
		setGlobalError("");
		setSuccessMessage("");
	}, []);

	const isValid = !errors.name && !errors.description && values.name.trim() !== "";

	return {
		values,
		errors,
		touched,
		isSubmitting,
		isValid,
		handleChange,
		handleBlur,
		handleSubmit,
		reset,
		globalError,
		successMessage,
		setGlobalError,
	};
}

// Re-export useNamesCache from its own file
export { useNamesCache } from "./useNamesCache";
