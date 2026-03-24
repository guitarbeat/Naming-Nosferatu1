import { useCallback } from "react";
import type { RatingData } from "@/shared/types";
import type { TournamentActions } from "@/store/appStore";

interface UseTournamentHandlersProps {
	userName: string;
	tournamentActions: TournamentActions;
}

export function useTournamentHandlers({ tournamentActions }: UseTournamentHandlersProps) {
	const handleTournamentComplete = useCallback(
		(ratings: Record<string, RatingData>) => {
			tournamentActions.setRatings(ratings);
			tournamentActions.setComplete(true);
		},
		[tournamentActions],
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
