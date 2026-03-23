/**
 * @module TournamentFlow
 * @description Main tournament flow component - handles name selection and navigation
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "@/shared/lib/icons";
import { ratingsAPI } from "@/shared/services/supabase/api";
import { enqueueRatingsMutation } from "@/shared/services/supabase/outbox";
import useAppStore from "@/store/appStore";
import { NameSelector } from "../components/NameSelector";
import { useTournamentHandlers } from "../hooks";

export default function TournamentFlow() {
	const { user, tournament, tournamentActions } = useAppStore();
	const navigate = useNavigate();

	const { handleStartNewTournament } = useTournamentHandlers({
		userName: user.name,
		tournamentActions,
	});

	useEffect(() => {
		if (tournament.isComplete && Object.keys(tournament.ratings).length > 0) {
			const userName = user.name || "anonymous";
			const ratingsSnapshot = tournament.ratings;

			ratingsAPI
				.saveRatings(userName, ratingsSnapshot)
				.then(async (result) => {
					if (!result?.success) {
						// Save failed (e.g. offline) — enqueue for later sync
						const records = Object.entries(ratingsSnapshot).map(
							([nameId, data]) => ({
								name_id: nameId,
								rating: data.rating,
								wins: data.wins,
								losses: data.losses,
							}),
						);
						await enqueueRatingsMutation(records);
						console.warn("Ratings save failed; queued for offline sync");
					}
				})
				.catch(async (_error) => {
					// Network error — enqueue for later sync
					const records = Object.entries(ratingsSnapshot).map(
						([nameId, data]) => ({
							name_id: nameId,
							rating: data.rating,
							wins: data.wins,
							losses: data.losses,
						}),
					);
					await enqueueRatingsMutation(records);
					console.warn(
						"Tournament ratings save failed; queued for offline sync",
					);
				});
		}
	}, [tournament.isComplete, tournament.ratings, user.name]);

	return (
		<div className="w-full flex flex-col gap-2">
			<AnimatePresence mode="wait">
				{tournament.isComplete && tournament.names !== null ? (
					<motion.div
						key="complete"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="w-full flex justify-center py-6 sm:py-10"
					>
						<div className="w-full max-w-2xl text-center px-4 sm:px-6">
							<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
								A victor emerges from the eternal tournament
							</h2>
							<div className="flex justify-center mb-6 sm:mb-8">
								<div className="p-4 sm:p-6 bg-primary/10 rounded-full border border-primary/20">
									<Trophy className="size-12 sm:size-14 text-primary" />
								</div>
							</div>
							<p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10">
								Your personal rankings have been updated. Head over to the{" "}
								<strong className="text-primary">Analyze</strong> section to see
								the full breakdown and compare results!
							</p>
							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
								<button
									type="button"
									onClick={() => navigate("/analysis")}
									className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 rounded-lg font-semibold transition-colors"
								>
									Analyze Results
								</button>
								<button
									type="button"
									onClick={handleStartNewTournament}
									className="w-full sm:w-auto px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold transition-colors"
								>
									Start New Tournament
								</button>
							</div>
						</div>
					</motion.div>
				) : (
					<motion.div
						key="setup"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="w-full py-0"
					>
						<NameSelector />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
