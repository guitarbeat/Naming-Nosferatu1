import { useCallback, useEffect, useState } from "react";
import { getConnectionInfo, IS_BROWSER, isSlowNetwork, useEventListener } from "./shared";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (!IS_BROWSER) {
			return;
		}

		const media = window.matchMedia(query);
		setMatches(media.matches);

		const listener = () => setMatches(media.matches);
		media.addEventListener("change", listener);

		return () => media.removeEventListener("change", listener);
	}, [query]);

	return matches;
}

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

export function useOfflineSync(): void {
	useOnlineStatus();
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
