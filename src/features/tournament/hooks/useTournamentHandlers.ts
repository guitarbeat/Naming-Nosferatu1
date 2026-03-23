import { useCallback } from "react";
import { ratingsAPI } from "@/shared/services/supabase/api";
import { enqueueRatingsMutation } from "@/shared/services/supabase/outbox";
import type { RatingData } from "@/shared/types";
import type { TournamentActions } from "@/store/appStore";

interface UseTournamentHandlersProps {
	userName: string;
	tournamentActions: TournamentActions;
}

export function useTournamentHandlers({ userName, tournamentActions }: UseTournamentHandlersProps) {
	const handleTournamentComplete = useCallback(
		(ratings: Record<string, RatingData>) => {
			tournamentActions.setRatings(ratings);
			tournamentActions.setComplete(true);

			// Fire-and-forget: persist ratings immediately at the completion boundary.
			// On failure (offline/network error), enqueue into IndexedDB outbox so
			// useOfflineSync can flush them when connectivity returns.
			const uName = userName || "anonymous";
			const records = Object.entries(ratings).map(([nameId, data]) => ({
				name_id: nameId,
				rating: data.rating,
				wins: data.wins,
				losses: data.losses,
			}));

			ratingsAPI
				.saveRatings(uName, ratings)
				.then(async (result) => {
					if (result?.success) {
						console.log(`Saved ${result.count} ratings to database`);
					} else {
						await enqueueRatingsMutation(records);
						console.warn("Ratings save failed; queued for offline sync");
					}
				})
				.catch(async () => {
					await enqueueRatingsMutation(records);
					console.warn("Ratings save error; queued for offline sync");
				});
		},
		[tournamentActions, userName],
	);

	const handleStartNewTournament = useCallback(() => {
		tournamentActions.resetTournament();
	}, [tournamentActions]);

	const handleUpdateRatings = useCallback(
		(
			ratings:
				| Record<string, RatingData>
				| ((prev: Record<string, RatingData>) => Record<string, RatingData>),
		) => {
			tournamentActions.setRatings(ratings);
		},
		[tournamentActions],
	);

	return {
		handleTournamentComplete,
		handleStartNewTournament,
		handleUpdateRatings,
	};
}
