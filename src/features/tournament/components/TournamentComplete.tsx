/**
 * @module TournamentComplete
 * @description Shared tournament completion screen
 */

import { useNavigate } from "react-router-dom";
import Button from "@/shared/components/layout/Button";
import { LogOut, Trophy } from "@/shared/lib/icons";

interface TournamentCompleteProps {
	totalMatches: number;
	participantCount: number;
	onNewTournament: () => void;
}

export function TournamentComplete({
	totalMatches,
	participantCount,
	onNewTournament,
}: TournamentCompleteProps) {
	const navigate = useNavigate();

	return (
		<div
			className="min-h-screen w-full font-display text-foreground selection:bg-primary/30"
			data-testid="tournament-complete-shell"
		>
			<div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6 py-10">
				<div className="w-full rounded-[1.5rem] border border-border/15 bg-foreground/[0.04] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-md">
					<div className="mb-6 flex justify-center">
						<Trophy className="size-16 text-green-300" />
					</div>
					<h1 className="font-whimsical text-4xl text-foreground tracking-wide mb-4">
						Tournament Complete!
					</h1>
					<p className="mb-6 text-foreground/72">
						Your results are ready. Review the bracket, then decide whether to start again.
					</p>

					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4 text-left">
							<div className="rounded-xl border border-border/12 bg-foreground/[0.03] p-4">
								<div className="text-sm text-muted-foreground mb-1">Total Matches</div>
								<div className="text-xl font-bold text-foreground">{totalMatches}</div>
							</div>
							<div className="rounded-xl border border-border/12 bg-foreground/[0.03] p-4">
								<div className="text-sm text-muted-foreground mb-1">Participants</div>
								<div className="text-xl font-bold text-foreground">{participantCount}</div>
							</div>
						</div>

						<div className="flex flex-col gap-3 pt-4">
							<Button
								type="button"
								onClick={onNewTournament}
								size="lg"
								shape="pill"
								className="w-full bg-primary/10 text-foreground hover:bg-primary/14"
								startIcon={<LogOut className="text-primary" />}
							>
								Start New Tournament
							</Button>

							<Button
								type="button"
								onClick={() => navigate("/analysis")}
								variant="secondary"
								size="lg"
								shape="pill"
								className="w-full bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06]"
								startIcon={<Trophy className="text-foreground" />}
							>
								View Analysis
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
