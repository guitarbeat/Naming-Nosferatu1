const CACHE_VERSION = "2025-12-08";
const STATIC_CACHE = `harmonic-studio-static-${CACHE_VERSION}`;
const HTML_CACHE = `harmonic-studio-html-${CACHE_VERSION}`;

const STATIC_ASSETS = [
	"/", // Basic shell; navigation responses use network-first to avoid staleness
];

const ASSET_REGEX =
	/\.(?:css|js|mjs|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mp3|wav)$/i;

/**
 * * Skip waiting on install so new bundles take effect quickly.
 */
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(STATIC_ASSETS))
			.catch(() => Promise.resolve())
			.then(() => self.skipWaiting()),
	);
});

/**
 * * Clean up old caches when a new version activates.
 */
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
								(key) =>
									key.startsWith("harmonic-studio-") &&
									key !== STATIC_CACHE &&
									key !== HTML_CACHE,
						)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

/**
 * * Handle update messages from the page to activate immediately.
 */
self.addEventListener("message", (event) => {
	if (event?.data?.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

/**
 * * Routing strategy:
 * * - Navigations: network-first to avoid serving stale HTML pointing to old bundles.
 * * - Same-origin static assets: cache-first for speed with background revalidation.
 * * - Other requests: pass through untouched so Supabase/Auth/RPC traffic is never cached.
 */
self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;

	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request, HTML_CACHE));
		return;
	}

	if (isSameOrigin && ASSET_REGEX.test(url.pathname)) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}
});

async function networkFirst(request, cacheName) {
	const cache = await caches.open(cacheName);
	try {
		const response = await fetch(request);
		if (response?.ok) {
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) {
			return cached;
		}
		throw error;
	}
}

async function cacheFirst(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) {
		fetchAndUpdate(request, cache).catch(() => {
			/* Ignore fetch errors */
		});
		return cached;
	}
	const response = await fetch(request);
	if (response?.ok) {
		cache.put(request, response.clone());
	}
	return response;
}

async function fetchAndUpdate(request, cache) {
	try {
		const response = await fetch(request);
		if (response?.ok) {
			cache.put(request, response.clone());
		}
	} catch {
		// * Network update failed; keep using cached response.
	}
}
