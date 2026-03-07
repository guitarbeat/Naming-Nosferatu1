import { type KeyboardEvent } from "react";
import {
	getFlameCount,
	getHeatCardClasses,
	type HeatLevel,
	STREAK_THRESHOLDS,
} from "@/features/tournament/lib/tournamentUi";
import { Card } from "@/shared/components/layout/Card";
import CatImage from "@/shared/components/layout/CatImage";

interface MatchSideCardProps {
	side: "left" | "right";
	name: string;
	img: string | null;
	heatLevel: HeatLevel | null;
	streak: number;
	isVoting: boolean;
	isSelected: boolean;
	hasSelectionFeedback: boolean;
	isTeam: boolean;
	members: string[];
	description?: string;
	pronunciation?: string;
	onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
	onVote: () => void;
	animationDelay?: string;
}

export function TournamentMatchSideCard({
	side,
	name,
	img,
	heatLevel,
	streak,
	isVoting,
	isSelected,
	hasSelectionFeedback,
	isTeam,
	members,
	description,
	pronunciation,
	onKeyDown,
	onVote,
	animationDelay,
}: MatchSideCardProps) {
	const isRight = side === "right";
	const overlayTextAlign = isRight ? "text-left sm:text-right" : "";
	const headingWrapClass = isRight ? "justify-end sm:justify-end" : "";
	const headingTextClass = isRight ? "text-left sm:text-right" : "";
	const pronunciationClass = isRight ? "mr-2" : "ml-2";
	const memberWrapClass = isRight ? "justify-start sm:justify-end" : "";
	const selectionClass = isSelected
		? "ring-2 ring-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.35)] scale-[1.02]"
		: hasSelectionFeedback
			? "opacity-[0.55] scale-[0.98]"
			: "";

	return (
		<div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
			<Card
				interactive={true}
				padding="none"
				className={`relative overflow-hidden group cursor-pointer flex-1 animate-float transition-all duration-300 ${
					isVoting ? "pointer-events-none" : ""
				} ${getHeatCardClasses(heatLevel)} ${selectionClass}`}
				style={animationDelay ? { animationDelay } : undefined}
				variant="default"
				role="button"
				tabIndex={isVoting ? -1 : 0}
				aria-label={`Vote for ${isTeam ? "team" : "name"} ${name}`}
				aria-disabled={isVoting}
				onKeyDown={onKeyDown}
				onClick={onVote}
			>
				<div className="relative w-full h-full flex items-center justify-center bg-foreground/10">
					{img ? (
						<CatImage
							src={img}
							alt={name}
							objectFit="cover"
							containerClassName="w-full h-full"
							imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
						/>
					) : (
						<span className="text-foreground/20 text-6xl font-bold select-none">
							{name[0]?.toUpperCase() || "?"}
						</span>
					)}

					{heatLevel && (
						<div className="pointer-events-none absolute inset-0 z-10">
							<div
								className={`absolute inset-0 ${
									heatLevel === "blazing"
										? "bg-gradient-to-t from-orange-500/45 via-amber-400/25 to-transparent"
										: heatLevel === "hot"
											? "bg-gradient-to-t from-orange-500/35 via-amber-300/20 to-transparent"
											: "bg-gradient-to-t from-orange-500/20 via-amber-200/10 to-transparent"
								}`}
							/>
							<div className="absolute bottom-14 left-0 right-0 flex justify-center gap-0.5 opacity-90">
								{Array.from({ length: getFlameCount(streak) }).map((_, i) => (
									<span
										key={`${side}-heat-${name}-${streak}-${i}`}
										className="text-sm sm:text-base animate-flame"
										style={{ animationDelay: `${i * 60}ms` }}
									>
										🔥
									</span>
								))}
							</div>
						</div>
					)}

					<div
						className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-20 flex flex-col justify-end pointer-events-none ${overlayTextAlign}`}
					>
						<div className={`flex items-center gap-2 flex-wrap ${headingWrapClass}`}>
							{isRight && streak >= STREAK_THRESHOLDS.warm && (
								<div className="flex gap-0.5">
									{Array.from({ length: Math.min(streak, 6) }).map((_, i) => (
										<span
											key={`${side}-pre-title-streak-${i}`}
											className="text-lg sm:text-2xl animate-pulse"
										>
											🔥
										</span>
									))}
								</div>
							)}
							<h3
								className={`font-whimsical text-2xl sm:text-3xl text-foreground tracking-wide break-words drop-shadow-md leading-tight ${headingTextClass}`}
							>
								{name}
							</h3>
							{!isRight && streak >= STREAK_THRESHOLDS.warm && (
								<div className="flex gap-0.5">
									{Array.from({ length: Math.min(streak, 6) }).map((_, i) => (
										<span
											key={`${side}-post-title-streak-${i}`}
											className="text-lg sm:text-2xl animate-pulse"
										>
											🔥
										</span>
									))}
								</div>
							)}
						</div>
						{pronunciation && (
							<span
								className={`${pronunciationClass} text-amber-400 text-lg sm:text-xl font-bold italic opacity-90`}
							>
								[{pronunciation}]
							</span>
						)}
						{isTeam ? (
							<div className={`mt-2 flex flex-wrap gap-1.5 ${memberWrapClass}`}>
								{members.map((member) => (
									<span
										key={`${side}-member-${member}`}
										className="rounded-full border border-border/30 bg-background/35 px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wide"
									>
										{member}
									</span>
								))}
							</div>
						) : description ? (
							<p
								className={`text-xs sm:text-sm text-foreground/90 italic line-clamp-2 mt-1 drop-shadow-sm ${overlayTextAlign}`}
							>
								{description}
							</p>
						) : null}
					</div>
				</div>
			</Card>
		</div>
	);
}
