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
	return {
		id: String(item.id),
		name: item.name,
		description: item.description ?? "",
		pronunciation: item.pronunciation ?? undefined,
		avgRating: item.avgRating ?? item.avg_rating ?? 1500,
		createdAt: item.createdAt ?? item.created_at ?? null,
		isHidden: item.isHidden ?? item.is_hidden ?? false,
		isActive: item.isActive ?? item.is_active ?? true,
		lockedIn: item.lockedIn ?? item.locked_in ?? false,
		status: (item.status as NameItem["status"]) ?? "candidate",
		provenance: item.provenance as NameItem["provenance"],
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
		try {
			const response = await api.post<{ success: boolean; data: any; error?: any }>("/names", {
				name,
				description,
			});
			if (response.success && response.data) {
				return { success: true, data: mapNameRow(response.data) };
			}
			return { success: false, error: response.error || "Failed to add name" };
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

		try {
			client = await resolveSupabaseClient();
			if (client) {
				try {
					if (userName) {
						await client.rpc("set_user_context", { user_name_param: userName });
					}
				} catch (error) {
					failures.push(
						`set_user_context failed: ${error instanceof Error ? error.message : "unknown error"}`,
					);
				}

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
		} catch (error) {
			failures.push(error instanceof Error ? error.message : "unknown error");
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
		try {
			return await api.get<any>("/analytics/site-stats");
		} catch {
			return {};
		}
	},
};

// Create circuit breaker for ratings API
const _ratingsCircuitBreaker = new ErrorManager.CircuitBreaker(3, 30000); // 3 failures, 30s timeout

export const ratingsAPI = {
	saveRatings: ErrorManager.createResilientFunction(
		async (
			userId: string,
			ratings: Record<string, { rating: number; wins: number; losses: number }>,
		) => {
			try {
				const ratingsList = Object.entries(ratings).map(([nameId, data]) => ({
					nameId,
					rating: data.rating,
					wins: data.wins,
					losses: data.losses,
				}));

				const response = await api.post<{ success: boolean; count: number }>("/ratings", {
					userId,
					ratings: ratingsList,
				});

				if (!response?.success) {
					throw new Error(`Failed to save ratings: ${response?.error || "Unknown error"}`);
				}

				return response;
			} catch (error) {
				// Log the error with context
				ErrorManager.handleError(error, "Ratings Save", {
					userId,
					ratingsCount: Object.keys(ratings).length,
					isRetryable: true,
				});

				// Fallback to localStorage if API is completely unavailable
				if (error instanceof Error && error.message.includes("fetch")) {
					try {
						const existingData = localStorage.getItem("ratings_fallback");
						const fallbackData = existingData ? JSON.parse(existingData) : {};
						fallbackData[userId] = { ...ratings, timestamp: Date.now() };
						localStorage.setItem("ratings_fallback", JSON.stringify(fallbackData));
						console.warn("Ratings saved to localStorage fallback due to API unavailability");
						return { success: true, count: Object.keys(ratings).length };
					} catch (fallbackError) {
						console.error("Failed to save ratings to localStorage fallback:", fallbackError);
					}
				}

				throw error;
			}
		},
		{
			threshold: 3,
			timeout: 30000,
			maxAttempts: 3,
			baseDelay: 1000,
		},
	),
};
