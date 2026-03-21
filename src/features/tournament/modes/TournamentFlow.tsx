/**
 * @module TournamentFlow
 * @description Main tournament flow component - handles name selection and navigation
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalToast } from "@/app/providers/Providers";
import Button from "@/shared/components/layout/Button";
import { Trophy } from "@/shared/lib/icons";
import { ratingsAPI } from "@/shared/services/supabase";
import useAppStore from "@/store/appStore";
import { NameSelector } from "../components/NameSelector";
import { useTournamentHandlers } from "../hooks";

const noopToast = {
	showInfo: (_message: string) => undefined,
	showError: (_message: string) => undefined,
};

export default function TournamentFlow() {
	const { user, tournament, tournamentActions } = useAppStore();
	const navigate = useNavigate();
	const toast = useOptionalToast() ?? noopToast;

	const { handleStartNewTournament } = useTournamentHandlers({
		userName: user.name,
		tournamentActions,
	});

	useEffect(() => {
		if (tournament.isComplete && Object.keys(tournament.ratings).length > 0) {
			const userName = user.name || "anonymous";

			const ratingsWithStats = Object.entries(tournament.ratings).reduce(
				(acc, [nameId, rating]) => {
					acc[nameId] = {
						rating,
						wins: 0,
						losses: 0,
					};
					return acc;
				},
				{} as Record<string, { rating: number; wins: number; losses: number }>,
			);

			ratingsAPI
				.saveRatings(userName, ratingsWithStats)
				.then((result) => {
					if (!result) {
						return;
					}

					if (result.status === "committed") {
						console.log(`Successfully saved ${result.count ?? 0} ratings to Supabase`);
						return;
					}

					if (result.status === "queued") {
						toast.showInfo(
							"Your ratings were queued locally and will sync when the connection is restored.",
						);
						return;
					}

					toast.showError(result.error || "Could not save ratings. Sign in again to sync results.");
				})
				.catch((_error) => {
					toast.showError("Could not save ratings. Sign in again to sync results.");
				});
		}
	}, [toast, tournament.isComplete, tournament.ratings, user.name]);

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
								<strong className="text-primary">Analyze</strong> section to see the full breakdown
								and compare results!
							</p>
							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
								<Button
									onClick={() => navigate("/analysis")}
									size="lg"
									shape="pill"
									className="w-full sm:w-auto"
								>
									Analyze Results
								</Button>
								<Button
									onClick={handleStartNewTournament}
									variant="secondary"
									size="lg"
									shape="pill"
									className="w-full sm:w-auto"
								>
									Start New Tournament
								</Button>
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
