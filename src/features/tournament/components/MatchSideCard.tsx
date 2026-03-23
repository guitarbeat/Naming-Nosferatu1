/**
 * @module MatchSideCard
 * @description Voteable card for one side of a tournament match
 */

import type { KeyboardEvent } from "react";
import CatImage from "@/shared/components/layout/CatImage";
import {
	getFlameCount,
	getHeatCardClasses,
	getHeatGradientClasses,
	type HeatLevel,
	STREAK_THRESHOLDS,
} from "../utils/heat";

export interface MatchSideCardProps {
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

function StreakFlames({
	count,
	side,
	name,
	streak,
	className = "text-sm sm:text-base animate-flame",
}: {
	count: number;
	side: string;
	name: string;
	streak: number;
	className?: string;
}) {
	return (
		<div className="flex gap-0.5">
			{Array.from({ length: count }).map((_, i) => (
				<span
					key={`${side}-flame-${name}-${streak}-${i}`}
					className={className}
					style={{ animationDelay: `${i * 60}ms` }}
				>
					🔥
				</span>
			))}
		</div>
	);
}

export function MatchSideCard({
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
	const textAlign = isRight ? "text-left sm:text-right" : "";
	const headingWrap = isRight ? "justify-end sm:justify-end" : "";
	const pronunciationPad = isRight ? "mr-2" : "ml-2";
	const memberWrap = isRight ? "justify-start sm:justify-end" : "";
	const selectionClass = isSelected
		? "ring-2 ring-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.35)] scale-[1.02]"
		: hasSelectionFeedback
			? "opacity-[0.55] scale-[0.98]"
			: "";

	const showStreak = streak >= STREAK_THRESHOLDS.warm;

	return (
		<div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
			<div
				className={`relative overflow-hidden rounded-xl group cursor-pointer flex-1 animate-float transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
					isVoting ? "pointer-events-none" : ""
				} ${getHeatCardClasses(heatLevel)} ${selectionClass}`}
				style={animationDelay ? { animationDelay } : undefined}
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
							<div className={`absolute inset-0 ${getHeatGradientClasses(heatLevel)}`} />
							<div className="absolute bottom-14 left-0 right-0 flex justify-center gap-0.5 opacity-90">
								<StreakFlames
									count={getFlameCount(streak)}
									side={side}
									name={name}
									streak={streak}
								/>
							</div>
						</div>
					)}

					<div
						className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-20 flex flex-col justify-end pointer-events-none ${textAlign}`}
					>
						<div className={`flex items-center gap-2 flex-wrap ${headingWrap}`}>
							{isRight && showStreak && (
								<StreakFlames
									count={Math.min(streak, 6)}
									side={side}
									name={name}
									streak={streak}
									className="text-lg sm:text-2xl animate-pulse"
								/>
							)}
							<h3
								className={`font-whimsical text-2xl sm:text-3xl text-foreground tracking-wide break-words drop-shadow-md leading-tight ${isRight ? "text-left sm:text-right" : ""}`}
							>
								{name}
							</h3>
							{!isRight && showStreak && (
								<StreakFlames
									count={Math.min(streak, 6)}
									side={side}
									name={name}
									streak={streak}
									className="text-lg sm:text-2xl animate-pulse"
								/>
							)}
						</div>
						{pronunciation && (
							<span
								className={`${pronunciationPad} text-amber-400 text-lg sm:text-xl font-bold italic opacity-90`}
							>
								[{pronunciation}]
							</span>
						)}
						{isTeam ? (
							<div className={`mt-2 flex flex-wrap gap-1.5 ${memberWrap}`}>
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
								className={`text-xs sm:text-sm text-foreground/90 italic line-clamp-2 mt-1 drop-shadow-sm ${textAlign}`}
							>
								{description}
							</p>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
