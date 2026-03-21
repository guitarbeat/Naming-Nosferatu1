import { ErrorManager } from "@/shared/services/errorManager";

export interface PersistedRatingRecord {
	name_id: string;
	rating: number;
	wins: number;
	losses: number;
}

export interface RatingsOutboxEntry {
	id: string;
	type: "save_user_ratings";
	payload: {
		ratings: PersistedRatingRecord[];
	};
	createdAt: number;
	lastAttemptAt: number | null;
	attempts: number;
	lastError: string | null;
}

export interface OutboxFlushResult {
	processed: number;
	succeeded: number;
	failed: number;
	remaining: number;
}

const DB_NAME = "naming-nosferatu";
const DB_VERSION = 1;
const STORE_NAME = "mutation_outbox";

function isIndexedDbAvailable(): boolean {
	return typeof indexedDB !== "undefined";
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
	});
}

function openOutboxDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!isIndexedDbAvailable()) {
			reject(new Error("IndexedDB is not available in this browser"));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
				store.createIndex("createdAt", "createdAt", { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
	});
}

async function withStore<T>(
	mode: IDBTransactionMode,
	handler: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
	const db = await openOutboxDb();

	try {
		const transaction = db.transaction(STORE_NAME, mode);
		const store = transaction.objectStore(STORE_NAME);
		const result = await handler(store);

		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () =>
				reject(transaction.error ?? new Error("IndexedDB transaction failed"));
			transaction.onabort = () =>
				reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
		});

		return result;
	} finally {
		db.close();
	}
}

function buildEntry(ratings: PersistedRatingRecord[]): RatingsOutboxEntry {
	return {
		id:
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `ratings_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		type: "save_user_ratings",
		payload: { ratings },
		createdAt: Date.now(),
		lastAttemptAt: null,
		attempts: 0,
		lastError: null,
	};
}

export async function enqueueRatingsMutation(
	ratings: PersistedRatingRecord[],
): Promise<RatingsOutboxEntry> {
	const entry = buildEntry(ratings);

	await withStore("readwrite", async (store) => {
		await promisifyRequest(store.put(entry));
		return undefined;
	});

	ErrorManager.addBreadcrumb("outbox.enqueue", "Queued ratings mutation", {
		entryId: entry.id,
		ratingsCount: ratings.length,
	});

	return entry;
}

export async function listRatingsMutations(): Promise<RatingsOutboxEntry[]> {
	try {
		return await withStore("readonly", async (store) => {
			const request = store.getAll();
			const entries = await promisifyRequest(request);
			return (entries as RatingsOutboxEntry[]).sort((left, right) => left.createdAt - right.createdAt);
		});
	} catch (error) {
		ErrorManager.handleError(error, "Outbox List", { isRetryable: false });
		return [];
	}
}

async function updateMutation(
	entry: RatingsOutboxEntry,
	updates: Partial<RatingsOutboxEntry>,
): Promise<void> {
	await withStore("readwrite", async (store) => {
		await promisifyRequest(
			store.put({
				...entry,
				...updates,
			}),
		);
		return undefined;
	});
}

export async function removeRatingsMutation(id: string): Promise<void> {
	await withStore("readwrite", async (store) => {
		await promisifyRequest(store.delete(id));
		return undefined;
	});
}

export async function getRatingsOutboxSnapshot(): Promise<{ count: number; oldestAgeMs: number | null }> {
	const entries = await listRatingsMutations();
	if (entries.length === 0) {
		return { count: 0, oldestAgeMs: null };
	}

	return {
		count: entries.length,
		oldestAgeMs: Date.now() - entries[0].createdAt,
	};
}

export async function flushRatingsMutations(
	processor: (entry: RatingsOutboxEntry) => Promise<void>,
): Promise<OutboxFlushResult> {
	const entries = await listRatingsMutations();
	let succeeded = 0;
	let failed = 0;

	for (const entry of entries) {
		try {
			await updateMutation(entry, {
				attempts: entry.attempts + 1,
				lastAttemptAt: Date.now(),
				lastError: null,
			});
			await processor(entry);
			await removeRatingsMutation(entry.id);
			succeeded += 1;
		} catch (error) {
			failed += 1;
			const message = error instanceof Error ? error.message : "Outbox replay failed";
			await updateMutation(entry, {
				attempts: entry.attempts + 1,
				lastAttemptAt: Date.now(),
				lastError: message,
			});
			ErrorManager.handleError(error, "Outbox Replay", {
				entryId: entry.id,
				ratingsCount: entry.payload.ratings.length,
			});
		}
	}

	const remaining = (await listRatingsMutations()).length;
	if (remaining > 0) {
		const snapshot = await getRatingsOutboxSnapshot();
		ErrorManager.addBreadcrumb("outbox.stale", "Ratings outbox still has pending work", {
			remaining,
			oldestAgeMs: snapshot.oldestAgeMs ?? 0,
		});
	}

	return {
		processed: entries.length,
		succeeded,
		failed,
		remaining,
	};
}
