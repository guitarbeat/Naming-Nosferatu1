import { useEffect, useState } from "react";
import type { NameItem } from "@/shared/types";

export function usePersonalResults({
	personalRatings,
	currentTournamentNames,
}: {
	personalRatings: Record<string, unknown> | undefined;
	currentTournamentNames?: NameItem[];
}) {
	const [rankings, setRankings] = useState<NameItem[]>([]);

	useEffect(() => {
		if (!personalRatings) {
			return;
		}

		// Build both lookup directions from the name list.
		// idToName: String(id) → display name
		// nameToId: name → String(id)  (for legacy name-keyed entries)
		const idToNameMap = new Map<string, string>();
		const nameToIdMap = new Map<string, string>();
		if (currentTournamentNames) {
			for (const n of currentTournamentNames) {
				if (n.id !== undefined) {
					const sid = String(n.id);
					idToNameMap.set(sid, n.name);
					nameToIdMap.set(n.name, sid);
				}
			}
		}

		const processed = Object.entries(personalRatings)
			.map(([key, rating]: [string, unknown]) => {
				const r = rating as { rating?: number; wins?: number; losses?: number } | number;

				// Prefer ID-keyed (new format): look up display name from the ID.
				// Fall back to name-keyed (legacy): key is already the display name.
				const isIdKey = idToNameMap.has(key);
				const resolvedName = isIdKey ? idToNameMap.get(key)! : key;
				const resolvedId = isIdKey ? key : (nameToIdMap.get(key) ?? undefined);

				return {
					name: resolvedName,
					rating: Math.round(typeof r === "number" ? r : r?.rating || 1500),
					wins: typeof r === "number" ? 0 : r?.wins || 0,
					losses: typeof r === "number" ? 0 : r?.losses || 0,
					id: resolvedId,
					isHidden: false,
					isActive: true,
					status: "candidate" as NameItem["status"],
					has_user_rating: true,
				};
			})
			.sort((a, b) => b.rating - a.rating);
		setRankings(processed as NameItem[]);
	}, [personalRatings, currentTournamentNames]);

	return { rankings, setRankings };
}
