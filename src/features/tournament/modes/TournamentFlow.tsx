/**
 * @module TournamentFlow
 * @description Main tournament flow component - handles name selection and navigation
 */

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/components/layout/Card";
import { Section } from "@/shared/components/layout/Section";
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
			<Section
				id="tournament-area"
				variant="minimal"
				padding="none"
				maxWidth="full"
				scrollMargin={false}
			>
				<AnimatePresence mode="wait">
					{tournament.isComplete && tournament.names !== null ? (
						<motion.div
							key="complete"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="w-full flex justify-center py-0"
						>
							<Card padding="xl" shadow="xl" className="text-center max-w-2xl">
								<h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent uppercase tracking-tighter">
									A victor emerges from the eternal tournament
								</h2>
								<div className="flex justify-center mb-8">
									<div className="text-6xl p-6 bg-purple-500/10 rounded-full border border-purple-500/20">
										🏆
									</div>
								</div>
								<p className="text-lg text-slate-300 mb-10">
									Your personal rankings have been updated. Head over to the{" "}
									<strong className="text-purple-400">Analyze</strong> section to see the full
									breakdown and compare results!
								</p>
								<div className="flex gap-4 justify-center">
									<button
										onClick={() => navigate("/analysis")}
										className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
									>
										Analyze Results
									</button>
									<button
										onClick={handleStartNewTournament}
										className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
									>
										Start New Tournament
									</button>
								</div>
							</Card>
						</motion.div>
					) : (
						<motion.div
							key="setup"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="w-full flex justify-center py-0"
						>
							<NameSelector />
						</motion.div>
					)}
				</AnimatePresence>
			</Section>
		</div>
	);
}
