import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/components/layout/Card";
import { LogOut, Trophy } from "@/shared/lib/icons";

interface TournamentCompleteViewProps {
	totalMatches: number;
	participantCount: number;
	onStartNew: () => void;
}

export function TournamentCompleteView({
	totalMatches,
	participantCount,
	onStartNew,
}: TournamentCompleteViewProps) {
	const navigate = useNavigate();

	return (
		<div className="relative min-h-screen w-full flex flex-col overflow-hidden font-display text-white selection:bg-primary/30">
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-0 w-40 h-40 bg-green-500/20 rounded-full animate-blob animation-delay-2000" />
				<div className="absolute top-1/3 right-0 w-32 h-32 bg-primary/20 rounded-full animate-blob" />
				<div className="absolute bottom-1/4 left-1/4 w-36 h-36 bg-yellow-500/20 rounded-full animate-blob animation-delay-4000" />
				<div className="absolute bottom-0 right-1/3 w-44 h-44 bg-green-500/15 rounded-full animate-blob animation-delay-2000" />
			</div>

			<div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
				<Card className="max-w-2xl w-full text-center p-8 space-y-4" variant="default">
					<div className="mb-6 flex justify-center">
						<Trophy className="size-16 text-green-400" />
					</div>
					<h1 className="name-card-title name-card-title--hero text-foreground mb-4">
						Tournament Complete!
					</h1>
					<p className="text-foreground/80 mb-6">
						Congratulations! Your tournament results are ready to review.
					</p>

					<div className="grid grid-cols-2 gap-4 text-left">
						<div className="bg-foreground/5 rounded-lg p-4">
							<div className="text-sm text-muted-foreground mb-1">Total Matches</div>
							<div className="text-xl font-bold text-foreground">{totalMatches}</div>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4">
							<div className="text-sm text-muted-foreground mb-1">Participants</div>
							<div className="text-xl font-bold text-foreground">{participantCount}</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 pt-4">
						<button
							type="button"
							onClick={onStartNew}
							className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-primary/20 cursor-pointer hover:bg-foreground/5 transition-colors"
						>
							<LogOut className="text-primary" />
							<span className="font-bold text-foreground">Start New Tournament</span>
						</button>

						<button
							type="button"
							onClick={() => navigate("/analysis")}
							className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-border/20 cursor-pointer hover:bg-foreground/5 transition-colors"
						>
							<Trophy className="text-foreground" />
							<span className="font-bold text-foreground">View Analysis</span>
						</button>
					</div>
				</Card>
			</div>
		</div>
	);
}
