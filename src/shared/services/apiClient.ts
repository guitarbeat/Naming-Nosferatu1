const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

const API_BASE = rawApiBase.replace(/\/+$/, "");

// Request deduplication cache
const pendingRequests = new Map<string, AbortController>();

function resolveRequestUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) {
		return url;
	}
	const normalizedPath = url.startsWith("/") ? url : `/${url}`;
	return `${API_BASE}${normalizedPath}`;
}

function buildRequestKey(url: string, options?: RequestInit): string {
	const method = options?.method?.toUpperCase() ?? "GET";
	const body = typeof options?.body === "string" ? options.body : "";
	return `${method}:${url}:${body}`;
}

function mergeRequestSignal(
	externalSignal: AbortSignal | null | undefined,
	internalController: AbortController,
): AbortSignal {
	if (!externalSignal) {
		return internalController.signal;
	}

	if (typeof AbortSignal.any === "function") {
		return AbortSignal.any([externalSignal, internalController.signal]);
	}

	if (externalSignal.aborted) {
		internalController.abort();
		return internalController.signal;
	}

	externalSignal.addEventListener("abort", () => internalController.abort(), { once: true });
	return internalController.signal;
}

function buildFetchOptions(
	options: RequestInit | undefined,
	abortController: AbortController,
): RequestInit {
	const { headers, signal, ...rest } = options ?? {};

	return {
		...rest,
		headers: { "Content-Type": "application/json", ...headers },
		signal: mergeRequestSignal(signal, abortController),
	};
}

function releasePendingRequest(requestKey: string, abortController: AbortController): void {
	if (pendingRequests.get(requestKey) === abortController) {
		pendingRequests.delete(requestKey);
	}
}

// Enhanced fetch with request deduplication
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
	const requestUrl = resolveRequestUrl(url);
	const requestKey = buildRequestKey(requestUrl, options);

	// Check for existing request
	const existingController = pendingRequests.get(requestKey);
	if (existingController) {
		// Cancel existing request and wait for it to complete
		existingController.abort();
	}

	// Create new AbortController for this request
	const abortController = new AbortController();
	pendingRequests.set(requestKey, abortController);

	try {
		const res = await fetch(requestUrl, buildFetchOptions(options, abortController));

		if (!res.ok) {
			const error = await res.json().catch(() => ({ error: res.statusText }));
			const message = error.error || error.message || `Request failed: ${res.status}`;
			throw new Error(res.status === 404 ? `${message} (${requestUrl})` : message);
		}
		return res.json();
	} finally {
		releasePendingRequest(requestKey, abortController);
	}
}

export const api = {
	get: <T>(url: string) => fetchJSON<T>(url),
	post: <T>(url: string, body: unknown) =>
		fetchJSON<T>(url, { method: "POST", body: JSON.stringify(body) }),
	patch: <T>(url: string, body: unknown) =>
		fetchJSON<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
	delete: <T>(url: string) => fetchJSON<T>(url, { method: "DELETE" }),
};
