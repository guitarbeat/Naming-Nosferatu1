/**
 * @module MatchSideCard
 * @description Voteable card for one side of a tournament match
 */

import type { KeyboardEvent } from "react";
import CatImage from "@/shared/components/layout/CatImage";
import {
	type HeatLevel,
	STREAK_THRESHOLDS,
	getHeatCardClasses,
	getHeatLabel,
	getHeatTextClasses,
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
	const textAlign = isRight ? "text-left sm:text-right" : "text-left";
	const headingWrap = isRight
		? "justify-start sm:justify-end"
		: "justify-start";
	const metaAlign = isRight ? "items-start sm:items-end" : "items-start";
	const memberWrap = isRight ? "justify-start sm:justify-end" : "";
	const selectionClass = isSelected
		? "ring-2 ring-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.22)]"
		: hasSelectionFeedback
			? "opacity-[0.55] saturate-75"
			: "";

	const showStreak = heatLevel !== null && streak >= STREAK_THRESHOLDS.warm;
	const streakLabel = heatLevel
		? `${getHeatLabel(heatLevel)} x${streak}`
		: null;

	return (
		<div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
			<div
				className={`relative overflow-hidden rounded-[1.1rem] border border-border/15 group cursor-pointer flex-1 transition-[border-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
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
				<div className="relative w-full h-full flex items-center justify-center bg-foreground/[0.07]">
					{img ? (
						<CatImage
							src={img}
							alt={name}
							objectFit="cover"
							containerClassName="w-full h-full"
							imageClassName="w-full h-full object-cover"
						/>
					) : (
						<span className="text-foreground/20 text-6xl font-bold select-none">
							{name[0]?.toUpperCase() || "?"}
						</span>
					)}

					<div
						className={`absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-background/92 via-background/56 to-transparent z-20 flex flex-col justify-end pointer-events-none ${textAlign}`}
					>
						<div className={`flex flex-col gap-2 ${metaAlign}`}>
							{showStreak && streakLabel ? (
								<span
									data-testid={`streak-chip-${side}`}
									className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase ${getHeatTextClasses(heatLevel)}`}
								>
									{streakLabel}
								</span>
							) : null}
							<div
								className={`flex items-center gap-2 flex-wrap ${headingWrap}`}
							>
								<h3
									className={`font-whimsical text-[1.85rem] sm:text-3xl text-foreground tracking-wide break-words drop-shadow-sm leading-tight ${isRight ? "text-left sm:text-right" : ""}`}
								>
									{name}
								</h3>
							</div>
						</div>
						{pronunciation && (
							<span className="mt-1 text-amber-100/85 text-sm sm:text-base font-medium italic">
								[{pronunciation}]
							</span>
						)}
						{isTeam ? (
							<div className={`mt-2 flex flex-wrap gap-1.5 ${memberWrap}`}>
								{members.map((member) => (
									<span
										key={`${side}-member-${member}`}
										className="rounded-full border border-border/20 bg-background/45 px-2 py-0.5 text-[10px] sm:text-xs font-medium tracking-wide text-foreground/75"
									>
										{member}
									</span>
								))}
							</div>
						) : description ? (
							<p
								className={`mt-2 text-xs sm:text-sm text-foreground/72 italic line-clamp-2 leading-snug ${textAlign}`}
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
