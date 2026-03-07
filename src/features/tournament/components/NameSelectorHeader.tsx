import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import Button from "@/shared/components/layout/Button";
import { Shuffle } from "@/shared/lib/icons";
import type { NameItem } from "@/shared/types";

function useSmartTooltip() {
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom">("top");

	const measureTooltip = useCallback(() => {
		if (!tooltipRef.current) {
			return;
		}

		const rect = tooltipRef.current.getBoundingClientRect();
		const spaceAbove = rect.top;
		const spaceBelow = window.innerHeight - rect.bottom;

		if (spaceAbove < 0 && spaceBelow > -spaceAbove) {
			setTooltipPosition("bottom");
		} else {
			setTooltipPosition("top");
		}
	}, []);

	return { tooltipRef, tooltipPosition, measureTooltip };
}

interface LockedNamesBannerProps {
	names: NameItem[];
}

export function LockedNamesBanner({ names }: LockedNamesBannerProps) {
	const { tooltipRef, tooltipPosition, measureTooltip } = useSmartTooltip();
	const lockedInNames = names.filter((name) => name.lockedIn || name.locked_in);

	if (lockedInNames.length === 0) {
		return null;
	}

	return (
		<div className="text-center space-y-4">
			<h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
				My cat's name is
			</h3>
			<div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 w-full px-2 relative z-[60]">
				{lockedInNames.map((nameItem) => (
					<motion.div
						key={nameItem.id}
						whileHover={{ y: -4, scale: 1.02 }}
						className="group relative shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 border-[1px] md:border-2 border-amber-500/30 bg-amber-500/10 ring-1 md:ring-2 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] rounded-sm"
					>
						<div className="text-foreground font-bold text-xs sm:text-sm md:text-base lg:text-lg">
							{nameItem.name}
						</div>

						{(nameItem.description || nameItem.pronunciation) && (
							<div
								ref={tooltipRef}
								onMouseEnter={measureTooltip}
								className={`name-lock-tooltip ${
									tooltipPosition === "top" ? "name-lock-tooltip--top" : "name-lock-tooltip--bottom"
								}`}
							>
								{nameItem.pronunciation && (
									<div className="name-lock-tooltip__header">
										<div className="name-lock-tooltip__label">Pronunciation</div>
										<div className="name-lock-tooltip__pronunciation">{nameItem.pronunciation}</div>
									</div>
								)}
								<div className="name-lock-tooltip__body">{nameItem.description}</div>
								<div className="name-lock-tooltip__arrow" />
							</div>
						)}
					</motion.div>
				))}
			</div>
		</div>
	);
}

interface NameSelectorTopControlsProps {
	isSwipeMode: boolean;
	selectedAvailableCount: number;
	availableCount: number;
	selectedHiddenCount: number;
	swipeHistoryLength: number;
	onUndo: () => void;
	onSelectAllVisible: () => void;
	onPickRandom: () => void;
	onClearSelection: () => void;
	canSelectAllAvailable: boolean;
	hasAnySelection: boolean;
}

export function NameSelectorTopControls({
	isSwipeMode,
	selectedAvailableCount,
	availableCount,
	selectedHiddenCount,
	swipeHistoryLength,
	onUndo,
	onSelectAllVisible,
	onPickRandom,
	onClearSelection,
	canSelectAllAvailable,
	hasAnySelection,
}: NameSelectorTopControlsProps) {
	return (
		<div className="text-center space-y-3">
			<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter leading-tight">
				Choose Your Contenders
			</h2>
			<p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
				{isSwipeMode
					? "Swipe right to select, left to skip. You can also use arrow keys (or A/D) and Ctrl+Z to undo."
					: "Click to select names • Select at least 2 names • 2v2 auto-enables when selected count is divisible by 4 (and >=4), otherwise 1v1"}
			</p>
			<div
				className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground"
				aria-live="polite"
			>
				<span>
					Selected: {selectedAvailableCount} / {availableCount}
				</span>
				{selectedHiddenCount > 0 && <span>Hidden selected: {selectedHiddenCount}</span>}
				{isSwipeMode && swipeHistoryLength > 0 && (
					<Button onClick={onUndo} variant="glass" size="small" className="px-3 py-1 text-xs">
						Undo Last ({swipeHistoryLength})
					</Button>
				)}
			</div>
			{!isSwipeMode && (
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button
						variant="glass"
						size="small"
						onClick={onSelectAllVisible}
						disabled={!canSelectAllAvailable}
					>
						Select all visible
					</Button>
					<Button variant="glass" size="small" onClick={onPickRandom}>
						<Shuffle size={14} />
						Pick 8 random
					</Button>
					<Button
						variant="glass"
						size="small"
						onClick={onClearSelection}
						disabled={!hasAnySelection}
					>
						Clear selection
					</Button>
				</div>
			)}
		</div>
	);
}
