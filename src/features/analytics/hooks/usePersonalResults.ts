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
		const nameToIdMap = new Map<string, string | number>();
		if (currentTournamentNames) {
			for (const n of currentTournamentNames) {
				if (n.id !== undefined) {
					nameToIdMap.set(n.name, n.id);
				}
			}
		}

		const processed = Object.entries(personalRatings)
			.map(([name, rating]: [string, unknown]) => {
				const r = rating as
					| { rating?: number; wins?: number; losses?: number }
					| number;
				return {
					name,
					rating: Math.round(typeof r === "number" ? r : r?.rating || 1500),
					wins: typeof r === "number" ? 0 : r?.wins || 0,
					losses: typeof r === "number" ? 0 : r?.losses || 0,
					id: nameToIdMap.get(name),
				};
			})
			.sort((a, b) => b.rating - a.rating);
		setRankings(processed as NameItem[]);
	}, [personalRatings, currentTournamentNames]);

	return { rankings, setRankings };
}
