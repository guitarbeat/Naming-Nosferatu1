import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { api } from "@/shared/services/apiClient";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";
import type { NameItem } from "@/shared/types";
import { getFallbackNames } from "../../../shared/fallbackNames";

type CatNameRow = Database["public"]["Tables"]["cat_names"]["Row"];

export type NamesDataSource = "supabase" | "api" | "fallback";

export interface NamesQueryResult {
	names: NameItem[];
	source: NamesDataSource;
}

export const namesQueryKeys = {
	all: ["names"] as const,
	lists: () => [...namesQueryKeys.all, "list"] as const,
	list: (includeHidden: boolean) => [...namesQueryKeys.lists(), { includeHidden }] as const,
	hiddenList: () => [...namesQueryKeys.all, "hidden"] as const,
} as const;

function mapNameRow(row: Partial<CatNameRow> & Record<string, unknown>): NameItem {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? ""),
		description: typeof row.description === "string" ? row.description : "",
		pronunciation: typeof row.pronunciation === "string" ? row.pronunciation : undefined,
		avgRating:
			typeof row.avg_rating === "number"
				? row.avg_rating
				: typeof row.avgRating === "number"
					? row.avgRating
					: 1500,
		avg_rating:
			typeof row.avg_rating === "number"
				? row.avg_rating
				: typeof row.avgRating === "number"
					? row.avgRating
					: 1500,
		createdAt:
			typeof row.created_at === "string"
				? row.created_at
				: typeof row.createdAt === "string"
					? row.createdAt
					: null,
		created_at:
			typeof row.created_at === "string"
				? row.created_at
				: typeof row.createdAt === "string"
					? row.createdAt
					: null,
		isHidden: Boolean(row.is_hidden ?? row.isHidden ?? false),
		is_hidden: Boolean(row.is_hidden ?? row.isHidden ?? false),
		isActive: row.is_active == null ? true : Boolean(row.is_active),
		is_active: row.is_active == null ? true : Boolean(row.is_active),
		lockedIn: Boolean(row.locked_in ?? row.lockedIn ?? false),
		locked_in: Boolean(row.locked_in ?? row.lockedIn ?? false),
		wins:
			typeof row.global_wins === "number"
				? row.global_wins
				: typeof row.wins === "number"
					? row.wins
					: 0,
		losses:
			typeof row.global_losses === "number"
				? row.global_losses
				: typeof row.losses === "number"
					? row.losses
					: 0,
		status: (typeof row.status === "string" ? row.status : "candidate") as NameItem["status"],
		provenance: Array.isArray(row.provenance) ? row.provenance : [],
		has_user_rating: false,
		popularity_score: typeof row.popularity_score === "number" ? row.popularity_score : undefined,
	};
}

async function fetchNamesFromSupabase(includeHidden: boolean): Promise<NameItem[] | null> {
	const client = await resolveSupabaseClient();
	if (!client) {
		return null;
	}

	let query = client
		.from("cat_names")
		.select(
			"id, name, description, pronunciation, avg_rating, global_wins, global_losses, created_at, is_hidden, is_active, locked_in, status, provenance, is_deleted",
		)
		.eq("is_active", true)
		.eq("is_deleted", false);

	if (!includeHidden) {
		query = query.eq("is_hidden", false);
	}

	const { data, error } = await query.order("avg_rating", { ascending: false });
	if (error) {
		throw error;
	}

	return (data ?? []).map((row) => mapNameRow(row));
}

async function fetchNamesFromApi(includeHidden: boolean): Promise<NameItem[]> {
	const rows = await api.get<Array<Record<string, unknown>>>(
		`/names?includeHidden=${includeHidden}`,
	);
	return (rows ?? []).map((row) => mapNameRow(row));
}

export async function fetchNames(includeHidden: boolean): Promise<NamesQueryResult> {
	try {
		const names = await fetchNamesFromSupabase(includeHidden);
		if (names) {
			return { names, source: "supabase" };
		}
	} catch (error) {
		console.warn("[names] Supabase query failed, falling back to API:", error);
	}

	try {
		const names = await fetchNamesFromApi(includeHidden);
		return { names, source: "api" };
	} catch (error) {
		console.warn("[names] API query failed, using fallback names:", error);
		return {
			names: getFallbackNames(includeHidden).map((row) =>
				mapNameRow(row as Partial<CatNameRow> & Record<string, unknown>),
			),
			source: "fallback",
		};
	}
}

export const namesQueryOptions = (includeHidden: boolean) =>
	queryOptions({
		queryKey: namesQueryKeys.list(includeHidden),
		queryFn: () => fetchNames(includeHidden),
		staleTime: 30_000,
	});
