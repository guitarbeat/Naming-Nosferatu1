/**
 * @module TournamentFlow
 * @description Main tournament flow component - handles name selection and navigation
 */

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trophy } from "@/shared/lib/icons";
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

	return (
		<div className="w-full flex flex-col gap-2">
			<AnimatePresence mode="wait">
				{tournament.isComplete && tournament.names !== null ? (
					<motion.div
						key="complete"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="mx-auto flex w-full max-w-2xl justify-center py-6 sm:py-10"
					>
						<div className="w-full text-center">
							<h2 className="mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-2xl font-bold uppercase tracking-tighter text-transparent sm:mb-6 sm:text-3xl md:text-4xl">
								A victor emerges from the eternal tournament
							</h2>
							<div className="mb-6 flex justify-center sm:mb-8">
								<div className="rounded-full border border-primary/20 bg-primary/10 p-4 sm:p-6">
									<Trophy className="size-12 text-primary sm:size-14" />
								</div>
							</div>
							<p className="mb-8 text-base text-muted-foreground sm:mb-10 sm:text-lg">
								Your personal rankings have been updated. Head over to the{" "}
								<strong className="text-primary">Analyze</strong> section to see the full breakdown
								and compare results!
							</p>
							<div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
								<button
									onClick={() => navigate("/analysis")}
									className="w-full rounded-lg bg-primary px-6 py-3 font-semibold transition-colors hover:bg-primary/90 sm:w-auto"
								>
									Analyze Results
								</button>
								<button
									onClick={handleStartNewTournament}
									className="w-full rounded-lg bg-secondary px-6 py-3 font-semibold transition-colors hover:bg-secondary/80 sm:w-auto"
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
