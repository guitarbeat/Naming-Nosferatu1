import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ErrorManager } from "@/shared/services/errorManager";
import type { NameItem, SyncMutationResult } from "@/shared/types";
import { getFallbackNames } from "../../../../shared/fallbackNames";
import {
	enqueueRatingsMutation,
	flushRatingsMutations,
	getRatingsOutboxSnapshot,
	type PersistedRatingRecord,
} from "./outbox";
import { resolveSupabaseClient } from "./runtime";

type NameRow = Database["public"]["Tables"]["cat_name_options"]["Row"];
type SiteStatsPayload = {
	totalNames?: unknown;
	activeNames?: unknown;
	hiddenNames?: unknown;
	totalUsers?: unknown;
	totalRatings?: unknown;
	totalSelections?: unknown;
	avgRating?: unknown;
};

type MutationResult<T = unknown> = SyncMutationResult<T> & {
	count?: number;
};

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

interface RpcErrorLike {
	message?: string;
	name?: string;
}

let usingFallbackData = false;

function toNumber(value: unknown, fallback = 0): number {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeError(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}

function isNetworkishError(error: unknown): boolean {
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.name === "AbortError" ||
		error.name === "NetworkError" ||
		error.message.toLowerCase().includes("network") ||
		error.message.toLowerCase().includes("fetch")
	);
}

function shouldUseDevFallback(): boolean {
	return Boolean(import.meta.env.DEV);
}

function mapNameRow(item: ApiNameRow): NameItem {
	return {
		id: String(item.id),
		name: item.name,
		description: item.description ?? "",
		pronunciation: item.pronunciation ?? undefined,
		avgRating: item.avgRating ?? item.avg_rating ?? 1500,
		avg_rating: item.avg_rating ?? item.avgRating ?? 1500,
		createdAt: item.createdAt ?? item.created_at ?? null,
		created_at: item.created_at ?? item.createdAt ?? null,
		isHidden: item.isHidden ?? item.is_hidden ?? false,
		is_hidden: item.is_hidden ?? item.isHidden ?? false,
		isActive: item.isActive ?? item.is_active ?? true,
		is_active: item.is_active ?? item.isActive ?? true,
		lockedIn: item.lockedIn ?? item.locked_in ?? false,
		locked_in: item.locked_in ?? item.lockedIn ?? false,
		status: (item.status as NameItem["status"]) ?? "candidate",
		provenance: item.provenance as NameItem["provenance"],
		has_user_rating: false,
	};
}

function mapDbNameRow(item: Partial<NameRow>): NameItem {
	return mapNameRow(item as ApiNameRow);
}

async function getClient() {
	const client = await resolveSupabaseClient();
	if (!client) {
		throw new Error("Supabase is not configured for this environment.");
	}
	return client;
}

async function getAuthContext(): Promise<{
	client: Awaited<ReturnType<typeof resolveSupabaseClient>>;
	user: User | null;
}> {
	const client = await getClient();
	const {
		data: { user },
		error,
	} = await client.auth.getUser();

	if (error) {
		throw new Error(error.message || "Failed to resolve Supabase session");
	}

	return { client, user };
}

async function requireAuthenticatedContext(): Promise<{
	client: Awaited<ReturnType<typeof resolveSupabaseClient>>;
	user: User;
}> {
	const { client, user } = await getAuthContext();

	if (!user) {
		throw new Error("A signed-in Supabase session is required for this action.");
	}

	return { client, user };
}

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
	const client = await getClient();
	const { data, error } = await (
		client.rpc as unknown as (
			rpcName: string,
			rpcArgs?: Record<string, unknown>,
		) => Promise<{ data: T; error: RpcErrorLike | null }>
	)(name, args);

	if (error) {
		throw new Error(error.message || `Supabase RPC "${name}" failed.`);
	}

	return data;
}

async function saveRatingsRpc(ratings: PersistedRatingRecord[]): Promise<number> {
	return await callRpc<number>("save_user_ratings", {
		p_ratings: ratings,
	});
}

async function replayQueuedRatings(): Promise<void> {
	const { user } = await requireAuthenticatedContext();

	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		throw new Error("Browser is offline");
	}

	await flushRatingsMutations(async (entry) => {
		await saveRatingsRpc(entry.payload.ratings);
		ErrorManager.addBreadcrumb("outbox.replay", "Replayed queued ratings mutation", {
			entryId: entry.id,
			userId: user.id,
			ratingsCount: entry.payload.ratings.length,
		});
	});
}

async function toggleAdminRpc(
	rpcName: "toggle_name_visibility" | "toggle_name_locked_in",
	args: Record<string, unknown>,
): Promise<MutationResult<boolean>> {
	try {
		const { user } = await requireAuthenticatedContext();
		const result = await callRpc<boolean>(rpcName, args);
		ErrorManager.addBreadcrumb("supabase.rpc.success", rpcName, {
			userId: user.id,
			...args,
		});
		return { success: true, status: "committed", data: result };
	} catch (error) {
		const message = normalizeError(error, `Failed to execute ${rpcName}`);
		ErrorManager.handleError(error, rpcName, { rpcName, ...args });
		ErrorManager.addBreadcrumb("supabase.rpc.failure", rpcName, {
			message,
			...args,
		});
		return {
			success: false,
			status: "failed",
			error: message,
		};
	}
}

export function isUsingFallbackData(): boolean {
	return usingFallbackData;
}

export const imagesAPI = {
	list: async (_path = "") => {
		try {
			const client = await getClient();
			const { data, error } = await client.storage.from("cat-images").list();

			if (error) {
				throw new Error(error.message || "Failed to list images");
			}

			return (data || []).map((item) => item.name);
		} catch (error) {
			ErrorManager.handleError(error, "Images List", { isRetryable: true });
			return [] as string[];
		}
	},

	upload: async (file: File | Blob, userName: string) => {
		const reportedFileType = (file as Blob).type || "blob";

		try {
			await requireAuthenticatedContext();
			const client = await getClient();
			const fileLike = file as Blob & { name?: string };
			const { size, type } = getBlobValidationMetadata(file);
			if (size !== null && size > IMAGE_UPLOAD_MAX_BYTES) {
				return {
					path: null,
					error: "File size exceeds 5MB limit",
					success: false,
				};
			}

			if (type !== null && !ALLOWED_IMAGE_TYPES.has(type)) {
				return {
					path: null,
					error: "Only JPEG, PNG, GIF, and WebP images are allowed",
					success: false,
				};
			}

			const sourceFileName =
				typeof fileLike.name === "string" && fileLike.name.length > 0
					? fileLike.name
					: "upload.jpg";
			const fileExt = sourceFileName.includes(".") ? sourceFileName.split(".").pop() || "jpg" : "jpg";
			const contentType = type || "image/jpeg";
			const timestamp = Date.now();
			const randomId = Math.random().toString(36).substring(2, 8);
			const uploadFileName = `${userName}_${timestamp}_${randomId}.${fileExt}`;

			const { error } = await client.storage.from("cat-images").upload(uploadFileName, file, {
				cacheControl: "3600",
				upsert: false,
				contentType,
			});

			if (error) {
				throw new Error(error.message || "Upload failed");
			}

			const {
				data: { publicUrl },
			} = client.storage.from("cat-images").getPublicUrl(uploadFileName);

			return {
				path: publicUrl,
				error: null,
				success: true,
			};
		} catch (error) {
			ErrorManager.handleError(error, "Images Upload", {
				fileType: reportedFileType,
			});
			return {
				path: null,
				error: normalizeError(error, "Upload failed"),
				success: false,
			};
		}
	},

	delete: async (fileName: string) => {
		try {
			await requireAuthenticatedContext();
			const client = await getClient();
			const { error } = await client.storage.from("cat-images").remove([fileName]);

			if (error) {
				throw new Error(error.message || "Delete failed");
			}

			return { success: true, error: null };
		} catch (error) {
			ErrorManager.handleError(error, "Images Delete", { fileName });
			return {
				success: false,
				error: normalizeError(error, "Delete failed"),
			};
		}
	},
};

export const coreAPI = {
	addName: async (name: string, description: string): Promise<MutationResult<NameItem>> => {
		try {
			const client = await getClient();
			const { data, error } = await client
				.from("cat_name_options")
				.insert({
					name: name.trim(),
					description: description.trim(),
					status: "candidate",
				})
				.select(
					"id, name, description, pronunciation, avg_rating, created_at, is_hidden, is_active, locked_in, status, provenance, is_deleted",
				)
				.single();

			if (error || !data) {
				throw new Error(error?.message || "Failed to add name");
			}

			return {
				success: true,
				status: "committed",
				data: mapDbNameRow(data),
			};
		} catch (error) {
			ErrorManager.handleError(error, "Add Name", {
				nameLength: name.trim().length,
				descriptionLength: description.trim().length,
			});
			return {
				success: false,
				status: "failed",
				error: normalizeError(error, "Failed to add name"),
			};
		}
	},

	getTrendingNames: async (includeHidden = false): Promise<NameItem[]> => {
		try {
			const client = await getClient();
			let query = client
				.from("cat_name_options")
				.select(
					"id, name, description, pronunciation, avg_rating, created_at, is_hidden, is_active, locked_in, status, provenance, is_deleted",
				)
				.eq("is_active", true)
				.eq("is_deleted", false);

			if (!includeHidden) {
				query = query.eq("is_hidden", false);
			}

			const { data, error } = await query.order("avg_rating", { ascending: false }).limit(1000);

			if (error) {
				throw new Error(error.message || "Failed to load names");
			}

			usingFallbackData = false;
			return (data ?? []).map((item) => mapDbNameRow(item));
		} catch (error) {
			if (shouldUseDevFallback()) {
				usingFallbackData = true;
				ErrorManager.addBreadcrumb("supabase.dev_fallback", "Using bundled fallback names", {
					includeHidden,
					message: normalizeError(error, "Unknown error"),
				});
				return getFallbackNames(includeHidden).map((item) => mapNameRow(item));
			}

			usingFallbackData = false;
			throw error;
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
		return toggleAdminRpc("toggle_name_visibility", {
			p_name_id: String(nameId),
			p_hide: isHidden,
		});
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

export const adminNamesAPI = {
	toggleLockedIn: async (nameId: string | number, lockedIn: boolean) => {
		return toggleAdminRpc("toggle_name_locked_in", {
			p_name_id: String(nameId),
			p_locked_in: lockedIn,
		});
	},
};

export const statsAPI = {
	getSiteStats: async (): Promise<SiteStatsPayload | null> => {
		try {
			const result = await callRpc<SiteStatsPayload>("get_site_stats");
			return result ?? null;
		} catch (error) {
			ErrorManager.handleError(error, "Get Site Stats", { isRetryable: true });
			return null;
		}
	},
};

function validateRatingsData(
	ratings: Record<string, { rating: number; wins: number; losses: number }>,
): { isValid: boolean; error?: string } {
	if (!ratings || typeof ratings !== "object") {
		return { isValid: false, error: "Invalid ratings payload" };
	}

	const entries = Object.entries(ratings);
	if (entries.length === 0) {
		return { isValid: false, error: "Ratings payload is empty" };
	}

	if (entries.length > 1000) {
		return { isValid: false, error: "Ratings payload is too large" };
	}

	for (const [nameId, data] of entries) {
		if (!nameId) {
			return { isValid: false, error: "Ratings payload contains an empty name id" };
		}

		if (
			typeof data?.rating !== "number" ||
			typeof data?.wins !== "number" ||
			typeof data?.losses !== "number"
		) {
			return { isValid: false, error: `Invalid rating entry for ${nameId}` };
		}

		if (!Number.isFinite(data.rating) || data.rating < 800 || data.rating > 3000) {
			return { isValid: false, error: `Invalid rating value for ${nameId}` };
		}

		if (
			!Number.isFinite(data.wins) ||
			data.wins < 0 ||
			!Number.isFinite(data.losses) ||
			data.losses < 0
		) {
			return { isValid: false, error: `Invalid win/loss counts for ${nameId}` };
		}
	}

	return { isValid: true };
}

function toPersistedRatings(
	ratings: Record<string, { rating: number; wins: number; losses: number }>,
): PersistedRatingRecord[] {
	return Object.entries(ratings).map(([nameId, data]) => ({
		name_id: String(nameId),
		rating: data.rating,
		wins: data.wins,
		losses: data.losses,
	}));
}

export const ratingsAPI = {
	saveRatings: ErrorManager.createResilientFunction(
		async (
			_userId: string,
			ratings: Record<string, { rating: number; wins: number; losses: number }>,
		): Promise<MutationResult<{ savedCount: number }>> => {
			const validation = validateRatingsData(ratings);
			if (!validation.isValid) {
				return {
					success: false,
					status: "failed",
					error: validation.error,
				};
			}

			const persistedRatings = toPersistedRatings(ratings);

			try {
				const { user } = await requireAuthenticatedContext();

				if (typeof navigator !== "undefined" && navigator.onLine === false) {
					await enqueueRatingsMutation(persistedRatings);
					const snapshot = await getRatingsOutboxSnapshot();
					ErrorManager.addBreadcrumb("outbox.enqueue", "Queued ratings while offline", {
						userId: user.id,
						pendingCount: snapshot.count,
						ratingsCount: persistedRatings.length,
					});
					return {
						success: true,
						status: "queued",
						data: { savedCount: persistedRatings.length },
						count: persistedRatings.length,
					};
				}

				const savedCount = await saveRatingsRpc(persistedRatings);
				ErrorManager.addBreadcrumb("supabase.rpc.success", "save_user_ratings", {
					userId: user.id,
					savedCount,
				});
				return {
					success: true,
					status: "committed",
					data: { savedCount },
					count: savedCount,
				};
			} catch (error) {
				const message = normalizeError(error, "Failed to save ratings");

				if (isNetworkishError(error)) {
					try {
						await requireAuthenticatedContext();
						await enqueueRatingsMutation(persistedRatings);
						const snapshot = await getRatingsOutboxSnapshot();
						ErrorManager.addBreadcrumb("outbox.enqueue", "Queued ratings after network failure", {
							pendingCount: snapshot.count,
							ratingsCount: persistedRatings.length,
						});
						return {
							success: true,
							status: "queued",
							data: { savedCount: persistedRatings.length },
							count: persistedRatings.length,
						};
					} catch (queueError) {
						ErrorManager.handleError(queueError, "Ratings Queue", {
							ratingsCount: persistedRatings.length,
						});
					}
				}

				ErrorManager.handleError(error, "Ratings Save", {
					ratingsCount: persistedRatings.length,
					isRetryable: true,
				});

				return {
					success: false,
					status: "failed",
					error: message,
				};
			}
		},
		{
			threshold: 3,
			timeout: 30000,
			maxAttempts: 3,
			baseDelay: 1000,
		},
	),

	replayQueuedRatings: async (): Promise<MutationResult<{ remaining: number }>> => {
		try {
			const beforeReplay = await getRatingsOutboxSnapshot();
			if (beforeReplay.count === 0) {
				return {
					success: true,
					status: "committed",
					data: { remaining: 0 },
					count: 0,
				};
			}

			await replayQueuedRatings();
			const snapshot = await getRatingsOutboxSnapshot();
			return {
				success: true,
				status: "committed",
				data: { remaining: snapshot.count },
				count: snapshot.count,
			};
		} catch (error) {
			ErrorManager.handleError(error, "Ratings Replay", { isRetryable: true });
			const snapshot = await getRatingsOutboxSnapshot();
			return {
				success: false,
				status: "failed",
				error: normalizeError(error, "Failed to replay queued ratings"),
				data: { remaining: toNumber(snapshot.count) },
			};
		}
	},

	getOutboxStatus: getRatingsOutboxSnapshot,
};
