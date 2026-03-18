import { api } from "@/shared/services/apiClient";
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

const trendingNamesRequests = new Map<string, Promise<NameItem[]>>();

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
                const cacheKey = includeHidden ? "includeHidden" : "visibleOnly";
                const existingRequest = trendingNamesRequests.get(cacheKey);
                if (existingRequest) {
                        return existingRequest;
                }

                const request = (async () => {
                        // Primary path: query Supabase directly (no Express backend needed)
                        const supabaseResult = await getNamesFromSupabase(includeHidden);
                        if (supabaseResult.length > 0) {
                                return supabaseResult;
                        }

                        // Fallback: try API server if Supabase returned nothing
                        try {
                                const data = await api.get<ApiNameRow[]>(`/names?includeHidden=${includeHidden}`);
                                return (data ?? []).map((item) => mapNameRow(item));
                        } catch {
                                return getFallbackNames(includeHidden).map((item) => mapNameRow(item));
                        }
                })();

                trendingNamesRequests.set(cacheKey, request);

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

export const ratingsAPI = {
        saveRatings: async (userId: string, ratings: Record<string, { rating: number; wins: number; losses: number }>) => {
                try {
                        const ratingsList = Object.entries(ratings).map(([nameId, data]) => ({
                                nameId,
                                rating: data.rating,
                                wins: data.wins,
                                losses: data.losses,
                        }));
                        return await api.post<{ success: boolean; count: number }>("/ratings", {
                                userId,
                                ratings: ratingsList,
                        });
                } catch (error) {
                        console.error("Failed to save ratings:", error);
                        return null;
                }
        },
};
