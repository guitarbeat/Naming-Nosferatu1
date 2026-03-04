import { api } from "@/services/apiClient";
import type { NameItem } from "@/shared/types";
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
	try {
		console.log("[v0] getNamesFromSupabase called, includeHidden:", includeHidden);
		const client = await resolveSupabaseClient();
		if (!client) {
			console.log("[v0] getNamesFromSupabase: no Supabase client available");
			return [];
		}
		console.log("[v0] getNamesFromSupabase: Supabase client obtained, querying...");

		let query = client
			.from("cat_name_options")
			.select(
				"id, name, description, pronunciation, avg_rating, created_at, is_hidden, is_active, locked_in, is_deleted",
			)
			.eq("is_active", true)
			.eq("is_deleted", false);

		if (!includeHidden) {
			query = query.eq("is_hidden", false);
		}

		const { data, error } = await query.order("avg_rating", { ascending: false }).limit(1000);
		if (error) {
			console.log("[v0] getNamesFromSupabase: Supabase query error:", error.message);
			return [];
		}

		console.log("[v0] getNamesFromSupabase: Got", data?.length ?? 0, "names from Supabase");
		return (data ?? []).map((item) => mapNameRow(item as unknown as ApiNameRow));
	} catch (err) {
		console.log("[v0] getNamesFromSupabase: caught exception:", err);
		return [];
	}
}

export const imagesAPI = {
	list: async (_path = "") => {
		return [] as string[];
	},
	upload: async (_file: File | Blob, _userName: string) => {
		return { path: null, error: "Image uploads not yet supported" } as {
			path: string | null;
			error?: string;
			success?: boolean;
		};
	},
};

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
		try {
			console.log("[v0] getTrendingNames: trying Express API...");
			const data = await api.get<ApiNameRow[]>(`/names?includeHidden=${includeHidden}`);
			console.log("[v0] getTrendingNames: Express API returned", data?.length ?? 0, "names");
			return (data ?? []).map((item) => mapNameRow(item));
		} catch (apiErr) {
			// Fallback when /api is not available (static-only deployments).
			console.log(
				"[v0] getTrendingNames: Express API failed, falling back to Supabase. Error:",
				apiErr,
			);
			return await getNamesFromSupabase(includeHidden);
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
					const rpcResult = await client.rpc("toggle_name_visibility" as any, {
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
