import { useMemo } from "react";

interface TournamentBracketTreeProps {
	round: number;
	totalRounds: number;
}

export function TournamentBracketTree({ round, totalRounds }: TournamentBracketTreeProps) {
	const rounds = useMemo(
		() => Array.from({ length: Math.max(1, totalRounds) }, (_, index) => index + 1),
		[totalRounds],
	);
	const stageFlavor = useMemo(() => {
		if (round >= totalRounds) {
			return "Crown Fight";
		}
		if (totalRounds - round === 1) {
			return "Final Four Chaos";
		}
		if (round <= 2) {
			return "Chaos Ladder";
		}
		return "Bracket Grind";
	}, [round, totalRounds]);

	return (
		<div className="rounded-xl border border-border/15 bg-foreground/[0.03] px-3 py-2">
			<div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				<span>Bracket Path</span>
				<span>{stageFlavor}</span>
			</div>
			<div className="flex items-center gap-1 overflow-x-auto pb-1">
				{rounds.map((stageRound, index) => {
					const isDone = stageRound < round;
					const isActive = stageRound === round;
					const tone = isActive
						? "border-primary/70 bg-primary/20 text-primary shadow-[0_0_18px_rgba(166,94,237,0.45)]"
						: isDone
							? "border-chart-2/45 bg-chart-2/10 text-chart-2"
							: "border-border/20 bg-foreground/5 text-foreground/65";
					const caption =
						stageRound === totalRounds
							? "Final"
							: stageRound === totalRounds - 1
								? "Semi"
								: stageRound === totalRounds - 2
									? "Quarter"
									: `R${stageRound}`;

					return (
						<div key={`bracket-tree-round-${stageRound}`} className="flex items-center gap-1">
							<div
								className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${tone}`}
							>
								{caption}
								{isActive ? " ✦" : ""}
							</div>
							{index < rounds.length - 1 && (
								<div
									className={`h-[1px] w-4 sm:w-6 ${
										isDone ? "bg-chart-2/70" : isActive ? "bg-primary/70" : "bg-border/20"
									}`}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
