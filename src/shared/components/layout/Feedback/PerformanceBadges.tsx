/**
 * @module PerformanceBadges
 * @description Performance badges and trend indicators for showing insights and metrics
 */

const INSIGHT_CATEGORIES: Record<string, { label: string; icon: string; description: string }> = {
	top_rated: {
		label: "Top Rated",
		icon: "⭐",
		description: "Among the highest rated names",
	},
	trending_up: {
		label: "Trending",
		icon: "📈",
		description: "Rising in popularity",
	},
	trending_down: {
		label: "Declining",
		icon: "📉",
		description: "Decreasing in popularity",
	},
	new: { label: "New", icon: "✨", description: "Recently added" },
	undefeated: {
		label: "Undefeated",
		icon: "🏆",
		description: "Has never lost a matchup",
	},
	popular: { label: "Popular", icon: "❤️", description: "Frequently selected" },
	underdog: {
		label: "Underdog",
		icon: "🐕",
		description: "Low rating but gaining traction",
	},
};

const getInsightCategory = (type: string) => INSIGHT_CATEGORIES[type] || null;

interface PerformanceBadgeProps {
	type: string;
	label?: string;
	variant?: "sm" | "md";
	className?: string;
}

function PerformanceBadge({ type, label, variant = "md", className = "" }: PerformanceBadgeProps) {
	const category = getInsightCategory(type);

	if (!category && !label) {
		return null;
	}

	const badgeLabel = label || category?.label || type;
	const badgeIcon = category?.icon || "•";
	const badgeDescription = category?.description || "";
	const badgeClass =
		`performance-badge performance-badge-${type} performance-badge-${variant} ${className}`.trim();

	return (
		<span className={badgeClass} aria-label={`${badgeLabel}: ${badgeDescription}`} role="status">
			<span className="badge-icon" aria-hidden="true">
				{badgeIcon}
			</span>
			<span className="badge-label">{badgeLabel}</span>
		</span>
	);
}

PerformanceBadge.displayName = "PerformanceBadge";

interface PerformanceBadgesProps {
	types?: string[];
	className?: string;
}

export function PerformanceBadges({ types = [], className = "" }: PerformanceBadgesProps) {
	if (!types || types.length === 0) {
		return null;
	}

	return (
		<div className={`performance-badges ${className}`.trim()}>
			{types.map((type) => (
				<PerformanceBadge key={type} type={type} variant="sm" />
			))}
		</div>
	);
}

PerformanceBadges.displayName = "PerformanceBadges";

/* ==========================================================================
   TREND INDICATOR COMPONENT
   ========================================================================== */

interface TrendIndicatorProps {
	direction?: "up" | "down" | "stable";
	percentChange?: number;
	compact?: boolean;
	className?: string;
	animated?: boolean;
}

export function TrendIndicator({
	direction = "stable",
	percentChange = 0,
	compact = false,
	className = "",
	animated = true,
}: TrendIndicatorProps) {
	const trendClass =
		`trend-indicator trend-${direction} ${animated ? "trend-animated" : ""} ${className}`.trim();

	const renderIcon = () => {
		switch (direction) {
			case "up":
				return (
					<span className="trend-icon" aria-hidden="true">
						📈
					</span>
				);
			case "down":
				return (
					<span className="trend-icon" aria-hidden="true">
						📉
					</span>
				);
			default:
				return (
					<span className="trend-icon" aria-hidden="true">
						➡️
					</span>
				);
		}
	};

	const ariaLabel = `${direction === "up" ? "Trending up" : direction === "down" ? "Trending down" : "Stable"} ${percentChange ? `by ${percentChange}%` : ""}`;

	if (compact) {
		return (
			<span className={trendClass} aria-label={ariaLabel}>
				{renderIcon()}
			</span>
		);
	}

	return (
		<span className={trendClass} aria-label={ariaLabel}>
			{renderIcon()}
			{percentChange !== 0 && (
				<span className="trend-value">
					{direction === "up" ? "+" : direction === "down" ? "−" : ""}
					{percentChange}%
				</span>
			)}
		</span>
	);
}

TrendIndicator.displayName = "TrendIndicator";
