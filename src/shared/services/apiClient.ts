const rawApiBase =
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	"/api";

const API_BASE = rawApiBase.replace(/\/+$/, "");

// Request deduplication cache with TTL
const pendingRequests = new Map<string, { controller: AbortController; timestamp: number }>();
const REQUEST_CACHE_TTL = 30 * 1000; // 30 seconds

// Response cache for GET requests
const responseCache = new Map<string, { data: any; timestamp: number }>();
const RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function resolveRequestUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) {
		return url;
	}
	const normalizedPath = url.startsWith("/") ? url : `/${url}`;
	return `${API_BASE}${normalizedPath}`;
}

// Enhanced fetch with request deduplication and response caching
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
	const requestUrl = resolveRequestUrl(url);
	const isGetRequest = !options?.method || options.method === 'GET';
	
	// Check response cache for GET requests
	if (isGetRequest) {
		const cached = responseCache.get(requestUrl);
		if (cached && Date.now() - cached.timestamp < RESPONSE_CACHE_TTL) {
			return cached.data;
		}
	}
	
	// Clean up expired entries
	const now = Date.now();
	for (const [key, entry] of pendingRequests.entries()) {
		if (now - entry.timestamp > REQUEST_CACHE_TTL) {
			entry.controller.abort();
			pendingRequests.delete(key);
		}
	}
	
	// Check for existing request
	const existing = pendingRequests.get(requestUrl);
	if (existing) {
		// Cancel existing request and wait for it to complete
		existing.controller.abort();
	}
	
	// Create new AbortController for this request
	const abortController = new AbortController();
	pendingRequests.set(requestUrl, { controller: abortController, timestamp: now });
	
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
		
		const data = await res.json();
		
		// Cache response for GET requests
		if (isGetRequest) {
			responseCache.set(requestUrl, { data, timestamp: now });
		}
		
		return data;
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
