import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/basic";

const DEFAULT_REVEAL_DELAY_MS = 480;
const DEFAULT_TOTAL_DURATION_MS = 1700;
const REDUCED_MOTION_REVEAL_DELAY_MS = 120;
const REDUCED_MOTION_TOTAL_DURATION_MS = 360;

function prefersReducedMotion(): boolean {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return false;
	}

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface LoadingSequenceProps {
	title: string;
	subtitle?: string;
	eyebrow?: string;
	tone?: "boot" | "victory";
	revealDelayMs?: number;
	totalDurationMs?: number;
	onComplete?: () => void;
	className?: string;
}

export function LoadingSequence({
	title,
	subtitle,
	eyebrow,
	tone = "boot",
	revealDelayMs = DEFAULT_REVEAL_DELAY_MS,
	totalDurationMs = DEFAULT_TOTAL_DURATION_MS,
	onComplete,
	className,
}: LoadingSequenceProps) {
	const [isOpening, setIsOpening] = useState(false);
	const [isFinished, setIsFinished] = useState(false);

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		const root = document.documentElement;
		const previousOverflow = document.body.style.overflow;
		const reduceMotion = prefersReducedMotion();
		const resolvedRevealDelay = reduceMotion
			? REDUCED_MOTION_REVEAL_DELAY_MS
			: revealDelayMs;
		const resolvedTotalDuration = reduceMotion
			? REDUCED_MOTION_TOTAL_DURATION_MS
			: totalDurationMs;

		root.dataset.loadingSequence = "sealed";
		document.body.style.overflow = "hidden";

		const revealTimer = window.setTimeout(() => {
			setIsOpening(true);
			root.dataset.loadingSequence = "opening";
		}, resolvedRevealDelay);

		const completeTimer = window.setTimeout(() => {
			delete root.dataset.loadingSequence;
			document.body.style.overflow = previousOverflow;
			setIsFinished(true);
			onComplete?.();
		}, resolvedTotalDuration);

		return () => {
			window.clearTimeout(revealTimer);
			window.clearTimeout(completeTimer);
			delete root.dataset.loadingSequence;
			document.body.style.overflow = previousOverflow;
		};
	}, [onComplete, revealDelayMs, totalDurationMs]);

	if (isFinished) {
		return null;
	}

	const resolvedEyebrow =
		eyebrow ?? (tone === "victory" ? "Final Tally" : "Wake The Bracket");

	return (
		<div
			className={cn(
				"loading-sequence",
				`loading-sequence--${tone}`,
				isOpening && "loading-sequence--opening",
				className,
			)}
			data-testid="loading-sequence"
			role="status"
			aria-live="polite"
			aria-label={subtitle ?? title}
		>
			<div className="loading-sequence__mask loading-sequence__mask--top" />
			<div className="loading-sequence__mask loading-sequence__mask--bottom" />

			<div className="loading-sequence__copy">
				<p className="loading-sequence__eyebrow">{resolvedEyebrow}</p>
				<h2 className="loading-sequence__title">{title}</h2>
				{subtitle ? (
					<p className="loading-sequence__subtitle">{subtitle}</p>
				) : null}
			</div>
		</div>
	);
}
