/**
 * @module Charts
 * @description Standardized chart components for data visualization
 * Combines BarChart and BumpChart functionality
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrendIndicator } from "@/shared/components/layout";

// Animation configuration for BumpChart
const ANIMATION_CONFIG = {
	lineDuration: 800,
	lineStagger: 120,
	pointDelay: 400,
	pointStagger: 60,
	legendDelay: 600,
	legendStagger: 80,
};

// Vibrant color palette for the lines (using flux colors from CSS)
// Enhanced high-contrast color palette for better accessibility and readability
const COLORS = [
	"#00f2ff", // Neon Cyan
	"#ff007a", // Hot Pink
	"#ffaa00", // Vibrant Amber
	"#7000ff", // Electric Purple
	"#00ff88", // Success Green
	"#ff4400", // Deep Orange
	"#0088ff", // Azure Blue
	"#ffdd00", // Bright Yellow
	"#ccff00", // Lime
	"#ff00ff", // Magenta
];

/**
 * Generate SVG path for a bump chart line (smooth curves)
 */
function generatePath(
	points: number[],
	chartWidth: number,
	_chartHeight: number,
	padding: number,
	rankToY: (rank: number, i?: number) => number,
): string {
	if (!points || points.length < 2) {
		return "";
	}

	const xStep = (chartWidth - padding * 2) / (points.length - 1);

	const coords = points.map((rank, i) => ({
		x: padding + i * xStep,
		y: rankToY(rank),
	}));

	// Create smooth bezier curve
	if (coords.length === 0) {
		return "";
	}
	// biome-ignore lint/style/noNonNullAssertion: coords length checked above, guaranteed to have elements
	let path = `M ${coords[0]!.x} ${coords[0]!.y}`;
	for (let i = 0; i < coords.length - 1; i++) {
		// biome-ignore lint/style/noNonNullAssertion: loop bounds ensure valid indices
		const current = coords[i]!;
		// biome-ignore lint/style/noNonNullAssertion: loop bounds ensure valid indices
		const next = coords[i + 1]!;
		const midX = (current.x + next.x) / 2;

		path += ` Q ${current.x} ${current.y} ${midX} ${current.y}`;
		path += ` Q ${next.x} ${next.y} ${next.x} ${next.y}`;
	}

	return path;
}

/**
 * BumpChart Component
 * Interactive bump chart visualization showing ranking changes over time.
 * Displays how cat names move up/down in rankings across different time periods.
 * Features animated line drawing and staggered point appearances.
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data series, each containing name and rankings array
 * @param {Array} props.labels - X-axis labels for time periods
 * @param {string} props.title - Chart title
 * @param {number} props.width - Chart width
 * @param {number} props.height - Chart height
 * @param {boolean} props.animated - Whether to animate the chart
 * @param {boolean} props.showLegend - Whether to show legend
 * @param {boolean} props.showTrends - Whether to show trend indicators
 * @param {string} props.className - Additional CSS classes
 */
export function BumpChart({
	data,
	labels,
	timeLabels,
	title,
	width = 800,
	height = 400,
	animated = true,
	showLegend = true,
	showTrends = true,
	className = "",
}: {
	data: Array<{
		name: string;
		rankings: number[];
	}>;
	labels?: string[];
	timeLabels?: string[];
	title: string;
	width?: number;
	height?: number;
	animated?: boolean;
	showLegend?: boolean;
	showTrends?: boolean;
	className?: string;
}) {
	// Support both labels and timeLabels props for compatibility
	const chartLabels = labels || timeLabels;
	const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
	const [hoveredPoint, setHoveredPoint] = useState<{
		seriesId: string;
		index: number;
	} | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);

	const chartWidth = width;
	const chartHeight = height;
	const padding = 60;
	const legendHeight = showLegend ? 40 : 0;

	const processedData = useMemo((): Array<{
		id: string;
		name: string;
		rankings: number[];
		color: string;
	}> => {
		if (!data || data.length === 0) {
			return [];
		}

		return data.map((series, index) => ({
			...series,
			color: COLORS[index % COLORS.length] || "var(--color-neutral-400)",
			id: (series as { id?: string }).id || `series-${index}`,
			name: series.name || `Series ${index + 1}`,
			rankings: series.rankings || [],
		}));
	}, [data]);

	const rankToY = useCallback(
		(rank: number) => {
			const maxRank = Math.max(...processedData.flatMap((s) => s.rankings));
			const availableHeight = chartHeight - padding * 2 - legendHeight;
			return padding + (rank - 1) * (availableHeight / maxRank);
		},
		[chartHeight, legendHeight, processedData],
	);

	const xPositions = useMemo(() => {
		if (!chartLabels || chartLabels.length === 0) {
			return [];
		}
		const step = (chartWidth - padding * 2) / (chartLabels.length - 1);
		return chartLabels.map((_, i) => padding + i * step);
	}, [chartWidth, chartLabels]);

	// Animation logic
	useEffect(() => {
		if (!animated || !svgRef.current) {
			return;
		}

		const svg = svgRef.current;
		if (!svg) {
			return;
		}
		const lines = svg.querySelectorAll(".charts-bump-chart-line") as NodeListOf<SVGPathElement>;
		const points = svg.querySelectorAll(".charts-bump-chart-point") as NodeListOf<SVGCircleElement>;
		const legends = svg.querySelectorAll(
			".charts-bump-chart-legend-item",
		) as NodeListOf<HTMLElement>;

		// Animate lines
		lines.forEach((line, index) => {
			const length = line.getTotalLength();
			line.style.strokeDasharray = String(length);
			line.style.strokeDashoffset = String(length);

			setTimeout(() => {
				line.style.transition = `stroke-dashoffset ${ANIMATION_CONFIG.lineDuration}ms ease-out`;
				line.style.strokeDashoffset = "0";
			}, index * ANIMATION_CONFIG.lineStagger);
		});

		// Animate points
		points.forEach((point, index) => {
			point.style.opacity = "0";
			point.style.transform = "scale(0)";

			setTimeout(
				() => {
					point.style.transition = "opacity 300ms ease-out, transform 300ms ease-out";
					point.style.opacity = "1";
					point.style.transform = "scale(1)";
				},
				ANIMATION_CONFIG.pointDelay + index * ANIMATION_CONFIG.pointStagger,
			);
		});

		// Animate legends
		legends.forEach((legend, index) => {
			legend.style.opacity = "0";

			setTimeout(
				() => {
					legend.style.transition = "opacity 300ms ease-out";
					legend.style.opacity = "1";
				},
				ANIMATION_CONFIG.legendDelay + index * ANIMATION_CONFIG.legendStagger,
			);
		});
	}, [animated]);

	if (!processedData?.length || !chartLabels?.length) {
		return null;
	}

	return (
		<div className={`charts-bump-chart-container ${className}`}>
			{title && <h3 className="charts-bump-chart-title">{title}</h3>}

			<svg
				ref={svgRef}
				className="charts-bump-chart-svg"
				width={chartWidth}
				height={chartHeight}
				viewBox={`0 0 ${chartWidth} ${chartHeight}`}
				role="img"
				aria-label={`Ranking history chart: ${title}`}
				tabIndex={0}
			>
				<title>{title || "Ranking History"}</title>
				<desc>A bump chart showing the change in rankings over time for different cat names.</desc>
				{/* Grid lines */}
				<defs>
					<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
						<path
							d="M 40 0 L 0 0 0 40"
							fill="none"
							stroke="var(--border-color, var(--color-neutral-200))"
							strokeWidth="0.5"
							opacity="0.3"
						/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />

				{/* Y-axis labels (rankings) */}
				{Array.from(
					{ length: Math.max(...processedData.flatMap((s) => s.rankings)) },
					(_, i) => i + 1,
				).map((rank) => (
					<text
						key={rank}
						x={padding - 10}
						y={rankToY(rank)}
						className="charts-bump-chart-axis-label"
						textAnchor="end"
						dominantBaseline="middle"
					>
						#{rank}
					</text>
				))}

				{/* X-axis labels (time periods) */}
				{chartLabels.map((label, i) => (
					<text
						key={label}
						x={xPositions[i]}
						y={chartHeight - padding + 20}
						className="charts-bump-chart-axis-label"
						textAnchor="middle"
					>
						{label}
					</text>
				))}

				{/* Vertical Focus Line on Hover */}
				{hoveredPoint && (
					<line
						x1={xPositions[hoveredPoint.index]}
						y1={padding}
						x2={xPositions[hoveredPoint.index]}
						y2={chartHeight - padding}
						stroke="var(--primary-color)"
						strokeWidth="1"
						strokeDasharray="4 2"
						opacity="0.5"
						pointerEvents="none"
					/>
				)}

				{/* Lines and points */}
				{processedData.map((series) => {
					const path = generatePath(series.rankings, chartWidth, chartHeight, padding, rankToY);
					const isHovered = hoveredSeries === series.id;

					return (
						<g
							key={series.id}
							role="graphics-object"
							aria-label={`Ranking line for ${series.name}`}
						>
							{/* Line */}
							<path
								d={path}
								className="charts-bump-chart-line"
								stroke={series.color}
								strokeWidth={isHovered ? 4 : 2}
								fill="none"
								opacity={isHovered ? 1 : 0.6}
								style={{ transition: "stroke-width 200ms, opacity 200ms" }}
							/>

							{/* Points */}
							{series.rankings.map((rank, pointIndex) => {
								const x = xPositions[pointIndex];
								const y = rankToY(rank);
								const isPointHovered =
									hoveredPoint?.seriesId === series.id && hoveredPoint?.index === pointIndex;

								return (
									<g key={`${series.id}-${pointIndex}`}>
										<circle
											cx={x}
											cy={y}
											r={isPointHovered ? 8 : isHovered ? 6 : 4}
											className="charts-bump-chart-point"
											fill={series.color}
											opacity={isHovered ? 1 : 0.8}
											onMouseEnter={() => {
												setHoveredSeries(series.id);
												setHoveredPoint({
													seriesId: series.id,
													index: pointIndex,
												});
											}}
											onMouseLeave={() => {
												setHoveredSeries(null);
												setHoveredPoint(null);
											}}
											role="button"
											aria-label={`${series.name} at ${chartLabels?.[pointIndex]}: Rank #${rank}`}
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													setHoveredSeries(series.id);
													setHoveredPoint({
														seriesId: series.id,
														index: pointIndex,
													});
												}
												if (e.key === "Escape") {
													setHoveredSeries(null);
													setHoveredPoint(null);
												}
											}}
											style={{
												transition: "r 200ms, opacity 200ms",
												cursor: "pointer",
											}}
										/>
										{isPointHovered && (
											<g pointerEvents="none">
												<rect
													x={(x ?? 0) + 10}
													y={y - 30}
													width={100}
													height={24}
													rx={4}
													fill="var(--glass-bg-strong)"
													stroke={series.color}
													strokeWidth={1}
												/>
												<text
													x={(x ?? 0) + 60}
													y={y - 14}
													textAnchor="middle"
													fontSize="12"
													fontWeight="600"
													fill="var(--text-primary)"
												>
													Rank #{rank}
												</text>
											</g>
										)}
									</g>
								);
							})}
						</g>
					);
				})}
			</svg>

			{/* Legend */}
			{showLegend && (
				<div className="charts-bump-chart-legend">
					{processedData.map((series) => (
						<div
							key={series.id}
							className="charts-bump-chart-legend-item"
							onMouseEnter={() => setHoveredSeries(series.id)}
							onMouseLeave={() => setHoveredSeries(null)}
						>
							<div
								className="charts-bump-chart-legend-color"
								style={{ backgroundColor: series.color }}
							/>
							<span className="charts-bump-chart-legend-label">{series.name}</span>
							{showTrends && series.rankings && series.rankings.length >= 2 && (
								<TrendIndicator
									direction={
										// biome-ignore lint/style/noNonNullAssertion: rankings length checked above
										series.rankings[series.rankings.length - 1]! < series.rankings[0]!
											? "up"
											: "down"
									}
									percentChange={Math.abs(
										// biome-ignore lint/style/noNonNullAssertion: rankings length checked above
										series.rankings[series.rankings.length - 1]! - series.rankings[0]!,
									)}
									compact={true}
								/>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
