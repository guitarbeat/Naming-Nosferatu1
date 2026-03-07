import type { StateCreator } from "zustand";
import { patch } from "@/store/storeUtils";
import type { AppState } from "@/store/types";

export const createTournamentSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<AppState, "tournament" | "tournamentActions">
> = (set, get) => ({
	tournament: {
		names: null,
		ratings: {},
		isComplete: false,
		isLoading: false,
		voteHistory: [],
		selectedNames: [],
	},

	tournamentActions: {
		setNames: (names) => {
			const currentRatings = get().tournament.ratings;
			patch(set, "tournament", {
				names:
					names?.map((n) => ({
						id: n.id,
						name: n.name,
						description: n.description,
						rating: currentRatings[n.name]?.rating ?? 1500,
					})) ?? null,
			});
		},

		setRatings: (ratingsOrFn) => {
			const current = get().tournament.ratings;
			const next = typeof ratingsOrFn === "function" ? ratingsOrFn(current) : ratingsOrFn;
			patch(set, "tournament", { ratings: { ...current, ...next } });
		},

		setComplete: (isComplete) => patch(set, "tournament", { isComplete }),
		setLoading: (isLoading) => patch(set, "tournament", { isLoading }),

		addVote: (vote) =>
			patch(set, "tournament", {
				voteHistory: [...get().tournament.voteHistory, vote],
			}),

		resetTournament: () =>
			patch(set, "tournament", {
				names: null,
				isComplete: false,
				voteHistory: [],
				isLoading: false,
			}),

		setSelection: (selectedNames) => patch(set, "tournament", { selectedNames }),
	},
});
