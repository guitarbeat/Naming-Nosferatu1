/**
 * @module mediaQuery
 * @description Safe helpers for browser media queries across runtime and tests.
 */

export type MediaQueryChangeHandler = (event: MediaQueryListEvent) => void;

type LegacyMediaQueryList = MediaQueryList & {
	addListener?: (listener: MediaQueryChangeHandler) => void;
	removeListener?: (listener: MediaQueryChangeHandler) => void;
};

function noop() {
	/* no-op */
}

export function supportsMatchMedia(): boolean {
	return (
		typeof window !== "undefined" && typeof window.matchMedia === "function"
	);
}

export function getMediaQueryList(query: string): MediaQueryList | null {
	if (!supportsMatchMedia()) {
		return null;
	}

	try {
		return window.matchMedia(query);
	} catch {
		return null;
	}
}

export function matchesMediaQuery(query: string, fallback = false): boolean {
	return getMediaQueryList(query)?.matches ?? fallback;
}

export function addMediaQueryListener(
	mediaQueryList: MediaQueryList | null,
	handler: MediaQueryChangeHandler,
): () => void {
	if (!mediaQueryList) {
		return noop;
	}

	if (typeof mediaQueryList.addEventListener === "function") {
		mediaQueryList.addEventListener("change", handler);
		return () => mediaQueryList.removeEventListener("change", handler);
	}

	const legacyMediaQueryList = mediaQueryList as LegacyMediaQueryList;
	legacyMediaQueryList.addListener?.(handler);
	return () => legacyMediaQueryList.removeListener?.(handler);
}

export function subscribeToMediaQuery(
	query: string,
	onChange: (matches: boolean, event?: MediaQueryListEvent) => void,
	options?: {
		emitInitial?: boolean;
		fallback?: boolean;
	},
): () => void {
	const { emitInitial = true, fallback = false } = options ?? {};
	const mediaQueryList = getMediaQueryList(query);

	if (!mediaQueryList) {
		if (emitInitial) {
			onChange(fallback);
		}
		return noop;
	}

	if (emitInitial) {
		onChange(mediaQueryList.matches);
	}

	return addMediaQueryListener(mediaQueryList, (event) =>
		onChange(event.matches, event),
	);
}
