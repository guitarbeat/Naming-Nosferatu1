const rawApiBase =
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	"/api";

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

// Enhanced fetch with request deduplication
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
	const requestUrl = resolveRequestUrl(url);
	
	// Check for existing request
	const existingController = pendingRequests.get(requestUrl);
	if (existingController) {
		// Cancel existing request and wait for it to complete
		existingController.abort();
	}
	
	// Create new AbortController for this request
	const abortController = new AbortController();
	pendingRequests.set(requestUrl, abortController);
	
	try {
		const res = await fetch(requestUrl, {
			headers: { "Content-Type": "application/json", ...options?.headers },
			signal: abortController.signal,
			...options,
		});
		
		// Clear the pending request when done
		pendingRequests.delete(requestUrl);
		
		if (!res.ok) {
			const error = await res.json().catch(() => ({ error: res.statusText }));
			const message = error.error || error.message || `Request failed: ${res.status}`;
			throw new Error(res.status === 404 ? `${message} (${requestUrl})` : message);
		}
		return res.json();
	} catch (error) {
		// Clear the pending request on error
		pendingRequests.delete(requestUrl);
		throw error;
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
