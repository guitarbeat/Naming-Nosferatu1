import {
	CardBody,
	Chip,
	cn,
	Button as HeroButton,
	Progress,
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@heroui/react";
import type React from "react";
import { useCallback, useMemo } from "react";
import type {
	ConsolidatedName,
	NameWithInsight,
	SummaryStats,
} from "@/services/analytics/analyticsService";
import { Card, CollapsibleHeader, PerformanceBadges } from "@/shared/components/layout";
import { devError, formatDate, getMetricLabel, getRankDisplay } from "@/shared/lib/basic";

// --- AnalysisPanel ---

interface AnalysisPanelProps {
	children: React.ReactNode;
	title?: string;
	actions?: React.ReactNode;
	showHeader?: boolean;
	toolbar?: React.ReactNode;
	className?: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
	children,
	title,
	actions,
	showHeader = true,
	toolbar,
	className = "",
}) => {
	return (
		<div className={cn("analysis-panel flex flex-col gap-4", className)}>
			{showHeader && <CollapsibleHeader title={title || ""} actions={actions} variant="compact" />}
			{toolbar && <div className="analysis-panel-toolbar flex gap-2">{toolbar}</div>}
			{children}
		</div>
	);
};

// --- AnalysisTable ---

interface AnalysisTableProps {
	names: ConsolidatedName[];
	isAdmin: boolean;
	canHideNames: boolean;
	sortField: string;
	sortDirection: string;
	onSort: (field: string) => void;
	onHideName: (id: string | number, name: string) => Promise<void>;
	summaryStats: SummaryStats | null;
}

export const AnalysisTable: React.FC<AnalysisTableProps> = ({
	names,
	isAdmin,
	canHideNames,
	sortField,
	sortDirection,
	onSort,
	onHideName,
	summaryStats,
}) => {
	const columns = useMemo(() => {
		const cols = [
			{ key: "rank", label: "Rank" },
			{ key: "name", label: "Name" },
			{
				key: "rating",
				label: isAdmin ? getMetricLabel("rating") : "Rating",
				sortable: true,
			},
			{
				key: "wins",
				label: isAdmin ? getMetricLabel("total_wins") : "Wins",
				sortable: true,
			},
			{
				key: "selected",
				label: isAdmin ? getMetricLabel("times_selected") : "Selected",
				sortable: true,
			},
		];

		if (isAdmin) {
			cols.push({ key: "insights", label: "Insights" });
		}

		cols.push({
			key: "dateSubmitted",
			label: isAdmin ? getMetricLabel("created_at") : "Date",
			sortable: true,
		});

		if (canHideNames) {
			cols.push({ key: "actions", label: "Actions" });
		}
		return cols;
	}, [isAdmin, canHideNames]);

	const renderCell = useCallback(
		(item: ConsolidatedName, columnKey: React.Key) => {
			const rank = names.findIndex((n) => n.id === item.id) + 1;
			const ratingPercent =
				summaryStats && (summaryStats.maxRating ?? 0) > 0
					? Math.min((item.rating / (summaryStats.maxRating ?? 1)) * 100, 100)
					: 0;
			const winsPercent =
				summaryStats && (summaryStats.maxWins ?? 0) > 0
					? Math.min((item.wins / (summaryStats.maxWins ?? 1)) * 100, 100)
					: 0;
			const selectedPercent =
				summaryStats && (summaryStats.maxSelected ?? 0) > 0
					? Math.min((item.selected / (summaryStats.maxSelected ?? 1)) * 100, 100)
					: 0;

			switch (columnKey) {
				case "rank":
					return (
						<Chip
							size="sm"
							variant="flat"
							className={cn(
								"border-none",
								rank <= 3 ? "bg-yellow-500/20 text-yellow-300" : "bg-white/10 text-white/60",
							)}
						>
							{isAdmin ? getRankDisplay(rank) : rank}
						</Chip>
					);
				case "name":
					return <span className="font-bold text-white">{item.name}</span>;
				case "rating":
					return (
						<div className="flex flex-col gap-1 min-w-[100px]">
							<div className="flex justify-between text-xs">
								<span>{Math.round(item.rating)}</span>
								{isAdmin && <span className="text-white/40">{item.ratingPercentile}%ile</span>}
							</div>
							{!isAdmin && (
								<Progress value={ratingPercent} color="warning" size="sm" aria-label="Rating" />
							)}
						</div>
					);
				case "wins":
					return (
						<div className="flex flex-col gap-1 min-w-[80px]">
							<span className="text-xs">{item.wins}</span>
							{!isAdmin && (
								<Progress value={winsPercent} color="success" size="sm" aria-label="Wins" />
							)}
						</div>
					);
				case "selected":
					return (
						<div className="flex flex-col gap-1 min-w-[80px]">
							<span className="text-xs">{item.selected}</span>
							{isAdmin && <span className="text-white/40">{item.selectedPercentile}%ile</span>}
							{!isAdmin && (
								<Progress
									value={selectedPercent}
									color="secondary"
									size="sm"
									aria-label="Selected"
								/>
							)}
						</div>
					);
				case "insights":
					return isAdmin ? (
						<PerformanceBadges
							types={Array.isArray(item.insights) ? (item.insights as string[]) : []}
						/>
					) : null;
				case "dateSubmitted":
					return (
						<span className="text-xs text-white/50">
							{item.dateSubmitted
								? formatDate(item.dateSubmitted, {
										month: "short",
										day: "numeric",
										year: "numeric",
									})
								: "—"}
						</span>
					);
				case "actions":
					return canHideNames ? (
						<HeroButton
							size="sm"
							color="danger"
							variant="light"
							onPress={async () => {
								try {
									await onHideName(item.id, item.name);
								} catch (error) {
									devError("[AnalysisDashboard] Failed to hide name:", error);
								}
							}}
						>
							Hide
						</HeroButton>
					) : null;
				default:
					return null;
			}
		},
		[names, summaryStats, isAdmin, canHideNames, onHideName],
	);

	return (
		<div className="w-full overflow-x-auto">
			<Table
				aria-label="Analytics Table"
				sortDescriptor={{
					column: sortField,
					direction: sortDirection === "asc" ? "ascending" : "descending",
				}}
				onSortChange={(descriptor) => onSort(descriptor.column as string)}
				classNames={{
					wrapper: "bg-white/5 border border-white/5",
					th: "bg-white/10 text-white/60",
					td: "text-white/80 py-3",
				}}
				removeWrapper={true}
			>
				<TableHeader columns={columns}>
					{(column) => (
						<TableColumn key={column.key} allowsSorting={!!column.sortable}>
							{column.label}
						</TableColumn>
					)}
				</TableHeader>
				<TableBody items={names}>
					{(item) => (
						<TableRow key={item.id}>
							{(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
};

// --- AnalysisInsights ---

interface AnalysisInsightsProps {
	namesWithInsights: NameWithInsight[];
	summaryStats: SummaryStats | null;
	generalInsights: Array<{ type: string; message: string; icon: string }>;
	isAdmin: boolean;
	canHideNames: boolean;
	onHideName: (id: string | number, name: string) => Promise<void>;
}

export const AnalysisInsights: React.FC<AnalysisInsightsProps> = ({
	namesWithInsights,
	summaryStats,
	generalInsights,
	isAdmin,
	canHideNames,
	onHideName,
}) => {
	const renderStatsSummary = () => {
		if (!summaryStats) {
			return null;
		}

		if (isAdmin) {
			return (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<Card variant="default">
						<CardBody className="gap-1">
							<div className="text-white/60 text-sm">Total Names</div>
							<div className="text-2xl font-bold text-white">{summaryStats.totalNames || 0}</div>
							<div className="text-xs text-white/40">{summaryStats.activeNames || 0} active</div>
						</CardBody>
					</Card>
					<Card variant="default">
						<CardBody className="gap-1">
							<div className="text-white/60 text-sm">Avg Rating</div>
							<div className="text-2xl font-bold text-white">{summaryStats.avgRating}</div>
							<div className="text-xs text-white/40">Global Average</div>
						</CardBody>
					</Card>
					<Card variant="default">
						<CardBody className="gap-1">
							<div className="text-white/60 text-sm">Total Votes</div>
							<div className="text-2xl font-bold text-white">{summaryStats.totalRatings || 0}</div>
							<div className="text-xs text-white/40">
								{summaryStats.totalSelections || 0} selections
							</div>
						</CardBody>
					</Card>
				</div>
			);
		}

		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<Card variant="warning">
					<CardBody className="gap-1">
						<div className="text-yellow-500/80 text-sm">Top Rating</div>
						<div className="text-2xl font-bold text-yellow-500">{summaryStats.maxRating ?? 0}</div>
						<div className="text-xs text-yellow-500/60 truncate">{summaryStats.topName?.name}</div>
					</CardBody>
				</Card>
				<Card variant="default">
					<CardBody className="gap-1">
						<div className="text-white/60 text-sm">Avg Rating</div>
						<div className="text-2xl font-bold text-white">{summaryStats.avgRating}</div>
						<div className="text-xs text-white/40">Across {namesWithInsights.length} names</div>
					</CardBody>
				</Card>
				<Card variant="default">
					<CardBody className="gap-1">
						<div className="text-white/60 text-sm">Total Selected</div>
						<div className="text-2xl font-bold text-white">{summaryStats.totalSelected ?? 0}</div>
						<div className="text-xs text-white/40">
							{(summaryStats.maxSelected ?? 0) > 0
								? `Most: ${summaryStats.maxSelected}x`
								: "No selections yet"}
						</div>
					</CardBody>
				</Card>
			</div>
		);
	};

	const renderGeneralInsights = () => {
		if (generalInsights.length === 0 || isAdmin) {
			return null;
		}
		return (
			<div className="flex flex-col gap-3 mb-6">
				{generalInsights.map((insight, idx) => (
					<Card key={idx} variant={insight.type === "warning" ? "warning" : "info"}>
						<CardBody className="flex flex-row items-center gap-3 p-3">
							<span className="text-lg">{insight.icon}</span>
							<span className="text-white/80 text-sm">{insight.message}</span>
						</CardBody>
					</Card>
				))}
			</div>
		);
	};

	const renderActionableInsights = () => {
		const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
		const lowPerformers = namesWithInsights.filter((n) =>
			n.insights.some((i: string) => highPriorityTags.includes(i)),
		);

		if (lowPerformers.length === 0) {
			return null;
		}

		return (
			<div className="mb-6">
				<h3 className="text-lg font-bold text-white mb-3">⚠️ Names to Consider Hiding</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{lowPerformers
						.sort((a, b) => {
							const priority: Record<string, number> = {
								inactive: 0,
								never_selected: 1,
								worst_rated: 2,
								poor_performer: 3,
							};
							const getP = (item: NameWithInsight) =>
								Math.min(
									...item.insights
										.filter((i: string) => highPriorityTags.includes(i))
										.map((i: string) => priority[i] ?? 99),
								);
							const pA = getP(a);
							const pB = getP(b);
							if (pA !== pB) {
								return pA - pB;
							}
							return a.rating - b.rating;
						})
						.slice(0, 12)
						.map((n) => (
							<Card key={n.id} variant="danger">
								<CardBody className="p-3 gap-2">
									<div className="flex justify-between items-start">
										<div className="font-bold text-white truncate pr-2">{n.name}</div>
										{canHideNames && (
											<HeroButton
												size="sm"
												color="danger"
												variant="flat"
												className="min-w-0 h-6 px-2 text-xs"
												onPress={async () => {
													try {
														await onHideName(n.id, n.name);
													} catch (error) {
														devError("[AnalysisDashboard] Failed to hide name:", error);
													}
												}}
											>
												Hide
											</HeroButton>
										)}
									</div>
									<div className="flex gap-3 text-xs text-white/60">
										<span>Rating {Math.round(n.rating)}</span>
										<span>{n.selected} sel</span>
										{n.wins > 0 && <span>{n.wins} wins</span>}
									</div>
									<div className="flex flex-wrap gap-1 mt-1">
										{n.insights
											.filter((i: string) => highPriorityTags.includes(i))
											.map((tag: string) => (
												<Chip
													key={tag}
													size="sm"
													color="warning"
													variant="flat"
													className="h-5 text-[10px]"
												>
													{tag.replace("_", " ")}
												</Chip>
											))}
									</div>
								</CardBody>
							</Card>
						))}
				</div>
			</div>
		);
	};

	const renderPositiveInsights = () => {
		const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];
		const topPerformers = namesWithInsights.filter((n) =>
			n.insights.some((i: string) => positiveTags.includes(i)),
		);

		if (topPerformers.length === 0) {
			return null;
		}

		return (
			<div className="mb-6">
				<h3 className="text-lg font-bold text-white mb-3">✨ Top Performers (Keep)</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{topPerformers.slice(0, 6).map((n) => (
						<Card key={n.id} variant="primary">
							<CardBody className="p-3 gap-2">
								<div className="font-bold text-white">{n.name}</div>
								<div className="flex gap-3 text-xs text-white/60">
									<span>Rating {Math.round(n.rating)}</span>
									<span>{n.selected} sel</span>
								</div>
								<div className="flex flex-wrap gap-1 mt-1">
									{n.insights
										.filter((i: string) => positiveTags.includes(i))
										.map((tag: string) => (
											<Chip
												key={tag}
												size="sm"
												color="secondary"
												variant="flat"
												className="h-5 text-[10px]"
											>
												{tag.replace("_", " ")}
											</Chip>
										))}
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6">
			{renderStatsSummary()}
			{renderGeneralInsights()}
			{renderActionableInsights()}
			{renderPositiveInsights()}
		</div>
	);
};
