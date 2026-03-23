/**
 * Application polyfills to ensure compatibility across different environments.
 * This file should be imported before any other application code in the entry point.
 */

// Polyfill window.matchMedia if it's missing (e.g. in some test environments or older browsers)
if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string): MediaQueryList => {
			const changeListeners = new Set<(event: MediaQueryListEvent) => void>();
			const toEvent = (): MediaQueryListEvent =>
				({ matches: mql.matches, media: mql.media }) as MediaQueryListEvent;

			const mql = {
				matches: false,
				media: query,
				onchange: null,
				addEventListener: ((
					type: string,
					listener: EventListenerOrEventListenerObject | null,
				) => {
					if (type !== "change" || !listener) {
						return;
					}
					const fn =
						typeof listener === "function"
							? (listener as (event: MediaQueryListEvent) => void)
							: (listener.handleEvent as (event: MediaQueryListEvent) => void);
					changeListeners.add(fn);
				}) as MediaQueryList["addEventListener"],
				removeEventListener: ((
					type: string,
					listener: EventListenerOrEventListenerObject | null,
				) => {
					if (type !== "change" || !listener) {
						return;
					}
					const fn =
						typeof listener === "function"
							? (listener as (event: MediaQueryListEvent) => void)
							: (listener.handleEvent as (event: MediaQueryListEvent) => void);
					changeListeners.delete(fn);
				}) as MediaQueryList["removeEventListener"],
				dispatchEvent: () => {
					const event = toEvent();
					for (const listener of changeListeners) {
						listener(event);
					}
					mql.onchange?.(event);
					return true;
				},
			} satisfies MediaQueryList;

			return mql;
		},
	});
}
