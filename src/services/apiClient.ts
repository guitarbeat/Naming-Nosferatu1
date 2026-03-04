const rawApiBase =
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	(import.meta.env.VITE_API_BASE as string | undefined) ??
	"/api";

const API_BASE = rawApiBase.replace(/\/+$/, "");

function resolveRequestUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) {
		return url;
	}
	const normalizedPath = url.startsWith("/") ? url : `/${url}`;
	return `${API_BASE}${normalizedPath}`;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
	const requestUrl = resolveRequestUrl(url);
	const res = await fetch(requestUrl, {
		headers: { "Content-Type": "application/json", ...options?.headers },
		...options,
	});
	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: res.statusText }));
		const message = error.error || error.message || `Request failed: ${res.status}`;
		throw new Error(res.status === 404 ? `${message} (${requestUrl})` : message);
	}
	return res.json();
}

export const api = {
	get: <T>(url: string, options?: RequestInit) => fetchJSON<T>(url, options),
	post: <T>(url: string, body: unknown, options?: RequestInit) =>
		fetchJSON<T>(url, { method: "POST", body: JSON.stringify(body), ...options }),
	patch: <T>(url: string, body: unknown, options?: RequestInit) =>
		fetchJSON<T>(url, { method: "PATCH", body: JSON.stringify(body), ...options }),
	delete: <T>(url: string, options?: RequestInit) =>
		fetchJSON<T>(url, { method: "DELETE", ...options }),
};
