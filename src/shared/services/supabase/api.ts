import { STORAGE_KEYS } from "@/shared/lib/constants";
import { api } from "@/shared/services/apiClient";
import { ErrorManager } from "@/shared/services/errorManager";
import type { NameItem } from "@/shared/types";
import { getFallbackNames } from "../../../../shared/fallbackNames";
import { resolveSupabaseClient } from "./runtime";

interface ApiNameRow {
	id: string | number;
	name: string;
	description?: string | null;
	pronunciation?: string | null;
	avgRating?: number | null;
	avg_rating?: number | null;
	createdAt?: string | null;
	created_at?: string | null;
	isHidden?: boolean;
	is_hidden?: boolean;
	isActive?: boolean | null;
	is_active?: boolean | null;
	lockedIn?: boolean;
	locked_in?: boolean;
	status?: string | null;
	provenance?: unknown;
	isDeleted?: boolean;
	is_deleted?: boolean;
}

interface SupabaseNamesQueryResult {
	data: unknown[] | null;
	error: { message?: string } | null;
}

interface SupabaseNamesQuery {
	select(columns: string): SupabaseNamesQuery;
	eq(column: string, value: boolean | string | number): SupabaseNamesQuery;
	order(column: string, options: { ascending: boolean }): SupabaseNamesQuery;
	limit(count: number): Promise<SupabaseNamesQueryResult>;
}

interface SupabaseNamesClient {
	from(table: string): SupabaseNamesQuery;
}

interface PendingRequest<T> {
	controller: AbortController;
	promise: Promise<T>;
}

const trendingNamesRequests = new Map<string, PendingRequest<NameItem[]>>();

function mapNameRow(item: ApiNameRow): NameItem {
	// Use automated field mapping for snake_case to camelCase conversion
	const mappedItem = mapSnakeToCamel(item);

	return {
		id: String(mappedItem.id),
		name: mappedItem.name,
		description: mappedItem.description ?? "",
		pronunciation: mappedItem.pronunciation ?? undefined,
		avgRating: mappedItem.avgRating ?? 1500,
		createdAt: mappedItem.createdAt ?? null,
		isHidden: mappedItem.isHidden ?? false,
		isActive: mappedItem.isActive ?? true,
		lockedIn: mappedItem.lockedIn ?? false,
		status: (mappedItem.status as NameItem["status"]) ?? "candidate",
		provenance: mappedItem.provenance as NameItem["provenance"],
		has_user_rating: false,
	};
}

async function getNamesFromSupabase(includeHidden: boolean): Promise<NameItem[]> {
	const client = (await resolveSupabaseClient()) as unknown as SupabaseNamesClient | null;
	if (!client) {
		return [];
	}

	const selectColumns =
		"id, name, description, pronunciation, avg_rating, created_at, is_hidden, is_active, locked_in, is_deleted";

	const filters: Record<string, any> = { is_active: true, is_deleted: false };
	if (!includeHidden) {
		filters.is_hidden = false;
	}

	let query: any = client.from("cat_name_options").select(selectColumns);
	for (const [key, value] of Object.entries(filters)) {
		query = query.eq(key, value);
	}
	const result = await query.order("avg_rating", { ascending: false }).limit(1000);
	if (result.error) {
		console.warn("[coreAPI.getTrendingNames] Supabase fallback failed:", result.error.message);
		return [];
	}

	return (result.data ?? []).map((item) => mapNameRow(item as unknown as ApiNameRow));
}

export const imagesAPI = {
	list: async (_path = "") => {
		try {
			const client = (await resolveSupabaseClient()) as any;
			if (!client) {
				return [] as string[];
			}

			const { data, error } = await client.storage.from("cat-images").list();

			if (error) {
				console.error("Failed to list images:", error);
				return [] as string[];
			}

			return (data || []).map((item: any) => item.name);
		} catch (error) {
			console.error("Error listing images:", error);
			return [] as string[];
		}
	},

	upload: async (file: File | Blob, userName: string) => {
		try {
			const client = (await resolveSupabaseClient()) as any;
			if (!client) {
				return {
					path: null,
					error: "Storage client not available",
					success: false,
				};
			}

			// Validate file
			if (file instanceof File) {
				const maxSize = 5 * 1024 * 1024; // 5MB
				const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

				if (file.size > maxSize) {
					return {
						path: null,
						error: "File size exceeds 5MB limit",
						success: false,
					};
				}

				if (!allowedTypes.includes(file.type)) {
					return {
						path: null,
						error: "Only JPEG, PNG, GIF, and WebP images are allowed",
						success: false,
					};
				}
			}

			// Generate unique filename
			const fileExt = file instanceof File ? file.name.split(".").pop() : "jpg";
			const timestamp = Date.now();
			const randomId = Math.random().toString(36).substring(2, 8);
			const fileName = `${userName}_${timestamp}_${randomId}.${fileExt}`;

			// Upload to Supabase Storage
			const { error } = await client.storage.from("cat-images").upload(fileName, file, {
				cacheControl: "3600",
				upsert: false,
				contentType: file instanceof File ? file.type : "image/jpeg",
			});

			if (error) {
				console.error("Upload failed:", error);
				return {
					path: null,
					error: error.message,
					success: false,
				};
			}

			// Get public URL
			const {
				data: { publicUrl },
			} = client.storage.from("cat-images").getPublicUrl(fileName);

			return {
				path: publicUrl,
				error: null,
				success: true,
			};
		} catch (error) {
			console.error("Error uploading image:", error);
			return {
				path: null,
				error: error instanceof Error ? error.message : "Upload failed",
				success: false,
			};
		}
	},

	delete: async (fileName: string) => {
		try {
			const client = (await resolveSupabaseClient()) as any;
			if (!client) {
				return { success: false, error: "Storage client not available" };
			}

			const { error } = await client.storage.from("cat-images").remove([fileName]);

			if (error) {
				console.error("Delete failed:", error);
				return { success: false, error: error.message };
			}

			return { success: true, error: null };
		} catch (error) {
			console.error("Error deleting image:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Delete failed",
			};
		}
	},
};

let usingFallbackData = false;

export function isUsingFallbackData(): boolean {
	return usingFallbackData;
}

export const coreAPI = {
	addName: async (name: string, description: string) => {
		const client = await resolveSupabaseClient();
		if (!client) {
			return { success: false, error: "Supabase client not available" };
		}

		try {
			const { data, error } = await client
				.from("cat_name_options")
				.insert({
					name,
					description,
					status: "candidate",
				})
				.select()
				.single();

			if (error) {
				return { success: false, error: error.message ?? "Failed to add name" };
			}

			return {
				success: true,
				data: data ? mapNameRow(data as ApiNameRow) : null,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "An unknown error occurred",
			};
		}
	},

	getTrendingNames: async (includeHidden: boolean = false) => {
		const cacheKey = includeHidden ? "includeHidden" : "visibleOnly";
		const existingRequest = trendingNamesRequests.get(cacheKey);

		// If request exists and is not aborted, return it
		if (existingRequest && !existingRequest.controller.signal.aborted) {
			return existingRequest.promise;
		}

		// Abort any existing request for this cache key
		if (existingRequest) {
			existingRequest.controller.abort();
			trendingNamesRequests.delete(cacheKey);
		}

		// Create new AbortController for this request
		const controller = new AbortController();

		const request = (async () => {
			// Primary path: query Supabase directly (no Express backend needed)
			const supabaseResult = await getNamesFromSupabase(includeHidden);
			if (supabaseResult.length > 0) {
				usingFallbackData = false;
				return supabaseResult;
			}

			// Check if request was aborted
			if (controller.signal.aborted) {
				throw new Error("Request aborted");
			}

			// Fallback: try API server if Supabase returned nothing
			try {
				const data = await api.get<ApiNameRow[]>(`/names?includeHidden=${includeHidden}`);
				usingFallbackData = false;
				return (data ?? []).map((item) => mapNameRow(item));
			} catch {
				if (controller.signal.aborted) {
					throw new Error("Request aborted");
				}
				usingFallbackData = true;
				console.warn("Using fallback/demo data - database connection unavailable");
				return getFallbackNames(includeHidden).map((item) => mapNameRow(item));
			}
		})();

		const pendingRequest: PendingRequest<NameItem[]> = {
			controller,
			promise: request,
		};

		trendingNamesRequests.set(cacheKey, pendingRequest);

		try {
			return await request;
		} finally {
			trendingNamesRequests.delete(cacheKey);
		}
	},

	getHiddenNames: async () => {
		const names = await coreAPI.getTrendingNames(true);
		return names
			.filter((item) => item.isHidden ?? item.is_hidden)
			.map((item) => ({
				id: String(item.id),
				name: String(item.name),
				description: typeof item.description === "string" ? item.description : null,
				created_at:
					typeof item.created_at === "string"
						? item.created_at
						: typeof item.createdAt === "string"
							? item.createdAt
							: "",
			}));
	},

	hideName: async (_userName: string, nameId: string | number, isHidden: boolean) => {
		const userName = _userName?.trim();
		const failures: string[] = [];
		const defaultError = `Failed to ${isHidden ? "hide" : "unhide"} name`;
		let client = null as Awaited<ReturnType<typeof resolveSupabaseClient>>;
		let contextOk = true;

		try {
			client = await resolveSupabaseClient();
			if (client) {
				try {
					if (userName) {
						const contextResult = await client.rpc("set_user_context", {
							user_name_param: userName,
						});
						if (contextResult.error) {
							contextOk = false;
							failures.push(`set_user_context failed: ${contextResult.error.message}`);
						}
					}
				} catch (error) {
					contextOk = false;
					failures.push(
						`set_user_context failed: ${error instanceof Error ? error.message : "unknown error"}`,
					);
				}

				if (contextOk) {
					try {
						const rpcResult = await client.rpc("toggle_name_visibility", {
							p_name_id: String(nameId),
							p_hide: isHidden,
							p_user_name: userName || undefined,
						});

						if (rpcResult.error) {
							failures.push(`toggle_name_visibility failed: ${rpcResult.error.message}`);
						} else if (rpcResult.data === true) {
							return { success: true };
						}
					} catch (error) {
						failures.push(
							`toggle_name_visibility failed: ${error instanceof Error ? error.message : "unknown error"}`,
						);
					}
				}
			}
		} catch (error) {
			failures.push(error instanceof Error ? error.message : "unknown error");
		}

		// If user-context setup failed, abort immediately — do not attempt
		// unauthenticated fallback paths that would bypass audit context.
		if (!contextOk) {
			return {
				success: false,
				error: failures.join(" | ") || defaultError,
			};
		}

		try {
			await api.patch(`/names/${nameId}/hide`, { isHidden });
			return { success: true };
		} catch (error) {
			failures.push(
				`API fallback failed: ${error instanceof Error ? error.message : "unknown error"}`,
			);
		}

		if (client) {
			const { error } = await client
				.from("cat_name_options")
				.update({ is_hidden: isHidden })
				.eq("id", String(nameId));
			if (error) {
				failures.push(`Direct table fallback failed: ${error.message}`);
			} else {
				return { success: true };
			}
		}

		return {
			success: false,
			error: failures.join(" | ") || defaultError,
		};
	},
};

export const hiddenNamesAPI = {
	getHiddenNames: async () => {
		return coreAPI.getHiddenNames();
	},

	hideName: async (_userName: string, nameId: string | number) => {
		return coreAPI.hideName(_userName, nameId, true);
	},

	unhideName: async (_userName: string, nameId: string | number) => {
		return coreAPI.hideName(_userName, nameId, false);
	},
};

export const statsAPI = {
	getSiteStats: async () => {
		const client = await resolveSupabaseClient();
		if (!client) {
			return {};
		}

		const { data, error } = await client.rpc("get_site_stats");
		if (error) {
			return {};
		}

		return data ?? {};
	},
};

// Automated field mapping utilities
const snakeToCamelCase = (str: string): string => {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const camelToSnakeCase = (str: string): string => {
	return str.replace(/([A-Z])/g, "_$1").toLowerCase();
};

const mapFields = <T extends Record<string, any>>(
	obj: T,
	mapper: (key: string) => string,
): Record<string, any> => {
	const mapped: Record<string, any> = {};
	for (const [key, value] of Object.entries(obj)) {
		const mappedKey = mapper(key);
		mapped[mappedKey] = value;
	}
	return mapped;
};

const mapSnakeToCamel = <T extends Record<string, any>>(obj: T): Record<string, any> => {
	return mapFields(obj, snakeToCamelCase);
};

const _mapCamelToSnake = <T extends Record<string, any>>(obj: T): Record<string, any> => {
	return mapFields(obj, camelToSnakeCase);
};

// localStorage management utilities
const LOCALSTORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB limit
const LOCALSTORAGE_CLEANUP_THRESHOLD = 0.8; // Clean at 80% capacity

const checkLocalStorageQuota = (): {
	available: boolean;
	usage: number;
	percentage: number;
} => {
	try {
		const testKey = `quota_test_${Date.now()}`;
		const testData = "x".repeat(1024); // 1KB test data

		// Check current usage
		let totalSize = 0;
		for (const key in localStorage) {
			if (Object.hasOwn(localStorage, key)) {
				totalSize += localStorage[key].length + key.length;
			}
		}

		const usagePercentage = totalSize / LOCALSTORAGE_QUOTA_BYTES;

		// Test if we can write more data
		try {
			localStorage.setItem(testKey, testData);
			localStorage.removeItem(testKey);
			return { available: true, usage: totalSize, percentage: usagePercentage };
		} catch {
			return {
				available: false,
				usage: totalSize,
				percentage: usagePercentage,
			};
		}
	} catch {
		return { available: false, usage: 0, percentage: 1 };
	}
};

const cleanupLocalStorage = (priorityKeys: string[] = []): void => {
	const quota = checkLocalStorageQuota();

	// Only cleanup if we're over threshold
	if (quota.percentage < LOCALSTORAGE_CLEANUP_THRESHOLD) {
		return;
	}

	// Collect all keys with their metadata
	const keysWithMeta: Array<{
		key: string;
		size: number;
		isPriority: boolean;
		timestamp?: number;
	}> = [];

	for (const key in localStorage) {
		if (Object.hasOwn(localStorage, key)) {
			const value = localStorage[key];
			const size = value.length + key.length;
			const isPriority = priorityKeys.includes(key);

			let timestamp: number | undefined;
			try {
				const parsed = JSON.parse(value);
				if (parsed && typeof parsed === "object" && "timestamp" in parsed) {
					timestamp = parsed.timestamp;
				}
			} catch {
				// Not JSON, skip timestamp extraction
			}

			keysWithMeta.push({ key, size, isPriority, timestamp });
		}
	}

	// Sort by priority (keep priority keys) then by timestamp (oldest first)
	keysWithMeta.sort((a, b) => {
		if (a.isPriority && !b.isPriority) {
			return 1;
		}
		if (!a.isPriority && b.isPriority) {
			return -1;
		}
		if (a.timestamp && b.timestamp) {
			return a.timestamp - b.timestamp;
		}
		if (a.timestamp && !b.timestamp) {
			return 1;
		}
		if (!a.timestamp && b.timestamp) {
			return -1;
		}
		return 0;
	});

	// Remove old non-priority keys until we're under threshold
	let removedSize = 0;
	const targetSize = LOCALSTORAGE_QUOTA_BYTES * 0.6; // Target 60% capacity

	for (const { key, size } of keysWithMeta) {
		if (quota.usage - removedSize <= targetSize) {
			break;
		}

		try {
			localStorage.removeItem(key);
			removedSize += size;
		} catch (error) {
			console.warn(`Failed to remove localStorage key ${key}:`, error);
		}
	}
};

const _safeLocalStorageSet = (key: string, value: string, isPriority: boolean = false): boolean => {
	const quota = checkLocalStorageQuota();

	// Cleanup if needed
	if (!quota.available || quota.percentage > LOCALSTORAGE_CLEANUP_THRESHOLD) {
		cleanupLocalStorage(isPriority ? [key] : []);
	}

	// Try to set the value
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (error) {
		console.warn(`localStorage quota exceeded for key ${key}:`, error);

		// Force cleanup and retry
		cleanupLocalStorage(isPriority ? [key] : []);
		try {
			localStorage.setItem(key, value);
			return true;
		} catch (retryError) {
			console.error("Failed to store data in localStorage even after cleanup:", retryError);
			return false;
		}
	}
};

// Validation utilities
const _validateRatingsData = (
	userId: string,
	ratings: Record<string, { rating: number; wins: number; losses: number }>,
): { isValid: boolean; error?: string } => {
	// Validate userId
	if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
		return {
			isValid: false,
			error: "Invalid userId: must be a non-empty string",
		};
	}

	// Validate ratings object
	if (!ratings || typeof ratings !== "object") {
		return { isValid: false, error: "Invalid ratings: must be an object" };
	}

	const ratingsCount = Object.keys(ratings).length;
	if (ratingsCount === 0) {
		return { isValid: false, error: "Invalid ratings: cannot be empty" };
	}

	if (ratingsCount > 1000) {
		return {
			isValid: false,
			error: "Invalid ratings: exceeds maximum limit of 1000 entries",
		};
	}

	// Validate each rating entry
	for (const [nameId, data] of Object.entries(ratings)) {
		if (!nameId || typeof nameId !== "string") {
			return {
				isValid: false,
				error: "Invalid nameId: must be a non-empty string",
			};
		}

		if (!data || typeof data !== "object") {
			return {
				isValid: false,
				error: `Invalid rating data for ${nameId}: must be an object`,
			};
		}

		const { rating, wins, losses } = data;

		// Validate rating value
		if (typeof rating !== "number" || Number.isNaN(rating) || rating < 800 || rating > 2400) {
			return {
				isValid: false,
				error: `Invalid rating for ${nameId}: must be a number between 800 and 2400`,
			};
		}

		// Validate wins
		if (typeof wins !== "number" || Number.isNaN(wins) || wins < 0 || wins > 1000) {
			return {
				isValid: false,
				error: `Invalid wins for ${nameId}: must be a number between 0 and 1000`,
			};
		}

		// Validate losses
		if (typeof losses !== "number" || Number.isNaN(losses) || losses < 0 || losses > 1000) {
			return {
				isValid: false,
				error: `Invalid losses for ${nameId}: must be a number between 0 and 1000`,
			};
		}
	}

	return { isValid: true };
};

// Create circuit breaker for ratings API
const _ratingsCircuitBreaker = new ErrorManager.CircuitBreaker(3, 30000); // 3 failures, 30s timeout

export const ratingsAPI = {
	saveRatings: async (
		userName: string,
		ratings: Record<string, { rating: number; wins: number; losses: number }>,
	) => {
		const supabaseClient = await resolveSupabaseClient();
		const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
		const ratingEntries = Object.entries(ratings);

		// If we can't reliably store via Supabase, fall back to localStorage.
		if (!supabaseClient || !userId) {
			const existingRaw = localStorage.getItem("ratings_fallback") || "{}";
			const fallbackData: Record<string, any> = JSON.parse(existingRaw);

			const userFallback = fallbackData[userName] ?? {};
			const timestamp = Math.floor(Date.now());
			for (const [nameId, data] of ratingEntries) {
				userFallback[nameId] = { ...data };
			}
			userFallback.timestamp = timestamp;

			fallbackData[userName] = userFallback;
			localStorage.setItem("ratings_fallback", JSON.stringify(fallbackData));

			return { success: true, count: ratingEntries.length };
		}

		// Match the Supabase insert/upsert contract expected by tests.
		const upsertPayload = ratingEntries.map(([nameId, data]) => ({
			user_id: userId,
			user_name: userName,
			name_id: nameId,
			rating: data.rating,
			wins: data.wins,
			losses: data.losses,
		}));

		const { error } = await supabaseClient.from("cat_name_ratings").upsert(upsertPayload, {
			onConflict: "user_id,name_id",
		});

		if (error) {
			return { success: false, count: 0 };
		}

		return { success: true, count: upsertPayload.length };
	},
};
