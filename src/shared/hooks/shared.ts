import { useEffect, useRef } from "react";

export const IS_BROWSER = typeof window !== "undefined";

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

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: any, ...args: Parameters<T>) {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => func.apply(this, args), wait);
	} as T;
}

export function getConnectionInfo(): NetworkInformation | null {
	if (!IS_BROWSER) {
		return null;
	}
	const nav = navigator as NavigatorWithConnection;
	return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

export function isSlowNetwork(connection: NetworkInformation | null): boolean {
	if (!connection) {
		return false;
	}
	const type = connection.effectiveType ?? "";
	const saveData = Boolean(connection.saveData);
	const rtt = connection.rtt ?? 0;
	const downlink = connection.downlink ?? 10;
	return type === "slow-2g" || type === "2g" || saveData || rtt > 300 || downlink < 1.5;
}

export function useEventListener<K extends keyof WindowEventMap>(
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
