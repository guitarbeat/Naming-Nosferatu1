import { AnimatePresence, motion } from "framer-motion";
import React, { memo, useCallback } from "react";
import { Button, CardStats, EmptyState } from "@/shared/components/layout";
import { Layers, LayoutGrid } from "@/shared/lib/icons";
import type { NameManagementViewExtensions, UseNameManagementViewResult } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { NameGrid } from "../components/NameGrid";
import { ProfileSection } from "../components/ProfileSection";
import { SwipeableCards } from "../components/SwipeableCards";

interface ManagementModeProps extends UseNameManagementViewResult {
	mode: "tournament" | "profile";
}

/**
 * ManagementMode Component
 * Consolidated view for both Tournament Setup and Profile/History management.
 * Replaces ProfileMode.tsx and TournamentMode.tsx
 */
export const ManagementMode = memo<ManagementModeProps>(
	({
		mode,
		names,
		filteredNames,
		isLoading,
		isError,
		error,
		refetch,
		clearErrors,
		toggleName,
		selectedNames,
		selectedCount,
		stats,
		filterStatus,
		setFilterStatus,
		selectionFilter,
		setSelectionFilter,
		searchTerm,
		setSearchTerm,
		setShowSelectedOnly,
		showSelectedOnly,
		handleFilterChange,
		handleAnalysisModeToggle,
		analysisMode,
		showCatPictures,
		tournamentProps = {},
		profileProps = {},
		setNames,
		extensions = {} as NameManagementViewExtensions,
	}: ManagementModeProps): React.ReactElement => {
		const isTournament = mode === "tournament";

		// Get swipe mode state from global store
		const isSwipeMode = useAppStore((state) => state.ui.isSwipeMode);
		const setSwipeMode = useAppStore((state) => state.uiActions.setSwipeMode);
		const showCatPicturesGlobal = useAppStore((state) => state.ui.showCatPictures);
		const setCatPictures = useAppStore((state) => state.uiActions.setCatPictures);

		// Direct mode setters instead of toggle
		const setGridMode = useCallback(() => {
			if (isSwipeMode) {
				setSwipeMode(false);
			}
		}, [isSwipeMode, setSwipeMode]);

		const setSwipeModeActive = useCallback(() => {
			if (!isSwipeMode) {
				setSwipeMode(true);
			}
		}, [isSwipeMode, setSwipeMode]);

		// Get handlers from tournamentProps
		const onStartTournament = (tournamentProps?.onStartTournament ?? tournamentProps?.onStart) as
			| ((names: typeof selectedNames) => void)
			| undefined;

		// Determine if we should show the progress bar (only in tournament setup with enough names)
		const showProgress = Boolean(isTournament && tournamentProps.showProgress && names.length > 0);
		const targetSize = (tournamentProps.targetSize as number) || 16;

		if (isError) {
			return (
				<EmptyState
					title="Error Loading Names"
					description={error?.message || "Please try again later"}
					icon="⚠️"
					action={
						<Button
							variant="danger"
							onClick={() => {
								clearErrors();
								refetch();
							}}
						>
							Retry
						</Button>
					}
				/>
			);
		}

		return (
			<main
				className="w-full max-w-[95%] mx-auto min-h-[80vh] flex flex-col gap-8 px-4 pb-24"
				data-component="management-mode"
			>
				{/* Profile Section (Only in Profile Mode) */}
				{!isTournament && (
					<ProfileSection
						onLogin={
							(profileProps.onLogin as (name: string) => Promise<boolean | undefined>) ||
							(profileProps.onUpdate as (name: string) => Promise<boolean | undefined>) ||
							(async (): Promise<boolean> => Promise.resolve(true))
						}
					/>
				)}

				<div className="flex flex-col gap-6">
					{/* View Mode Toggle - Sticky header for tournament mode */}
					{isTournament && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="sticky top-0 z-20 flex flex-col gap-4 px-4 py-3 -mx-4 bg-black/90 backdrop-blur-xl border-b border-white/10"
						>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={setGridMode}
										className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
											isSwipeMode
												? "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
												: "bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
										}`}
									>
										<LayoutGrid size={16} />
										Grid
									</button>
									<button
										type="button"
										onClick={setSwipeModeActive}
										className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
											isSwipeMode
												? "bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
												: "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
										}`}
									>
										<Layers size={16} />
										Swipe
									</button>
								</div>
								<span className="text-xs text-white/50 font-medium">{selectedCount} selected</span>
							</div>
							<div className="tournament-toolbar-filters-container">
								<div className="tournament-toolbar-filters-grid">
									<div className="tournament-toolbar-search-wrapper">
										<span className="tournament-toolbar-search-icon">🔍</span>
										<input
											type="search"
											placeholder="Search names"
											value={searchTerm}
											onChange={(event) => setSearchTerm(event.target.value)}
											className="tournament-toolbar-search-input analysis-input"
											aria-label="Search names"
										/>
									</div>
									<div className="tournament-toolbar-filter-group">
										<span className="tournament-toolbar-filter-label">Visibility</span>
										<select
											value={filterStatus}
											onChange={(event) =>
												setFilterStatus(event.target.value as "all" | "visible" | "hidden")
											}
											className="tournament-toolbar-filter-select"
											disabled={!analysisMode}
										>
											<option value="visible">Visible</option>
											<option value="hidden">Hidden</option>
											<option value="all">All</option>
										</select>
									</div>
									<div className="tournament-toolbar-filter-group">
										<span className="tournament-toolbar-filter-label">Selection</span>
										<select
											value={selectionFilter}
											onChange={(event) =>
												setSelectionFilter(event.target.value as "all" | "selected" | "unselected")
											}
											className="tournament-toolbar-filter-select"
										>
											<option value="all">All</option>
											<option value="selected">Selected</option>
											<option value="unselected">Unselected</option>
										</select>
									</div>
									<div className="toolbar-segmented">
										<button
											type="button"
											onClick={() => setShowSelectedOnly(!showSelectedOnly)}
											className={`toolbar-toggle ${showSelectedOnly ? "toolbar-toggle--active" : ""}`}
										>
											{showSelectedOnly ? "Showing Selected" : "Show Selected"}
										</button>
										<div className="toolbar-divider" />
										<button
											type="button"
											onClick={() => setCatPictures(!showCatPicturesGlobal)}
											className={`toolbar-toggle ${showCatPicturesGlobal ? "toolbar-toggle--active" : ""}`}
										>
											{showCatPicturesGlobal ? "Cats On" : "Cats Off"}
										</button>
										<div className="toolbar-divider" />
										<button
											type="button"
											onClick={handleAnalysisModeToggle}
											className={`toolbar-toggle toolbar-toggle--accent ${analysisMode ? "toolbar-toggle--active" : ""}`}
										>
											{analysisMode ? "Exit Analysis" : "Enter Analysis"}
										</button>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{isTournament && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<CardStats
								label="Total"
								value={stats.total}
								emoji="📇"
								variant="primary"
								className="min-h-[110px]"
							/>
							<CardStats
								label="Visible"
								value={stats.visible}
								emoji="👀"
								variant="info"
								className="min-h-[110px]"
							/>
							<CardStats
								label="Hidden"
								value={stats.hidden}
								emoji="🕵️"
								variant="warning"
								className="min-h-[110px]"
							/>
							<CardStats
								label="Selected"
								value={stats.selected}
								emoji="✅"
								variant="success"
								className="min-h-[110px]"
							/>
						</div>
					)}

					{showProgress && (
						<div
							className="flex flex-col gap-1 px-1 animate-in fade-in slide-in-from-left-4 duration-700"
							role="progressbar"
							aria-valuenow={selectedCount}
							aria-valuemax={targetSize}
						>
							<div className="h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
								<div
									className="h-full bg-gradient-to-r from-purple-500/80 to-pink-500/80 transition-all duration-500"
									style={{
										width: `${Math.max((selectedCount / targetSize) * 100, 3)}%`,
									}}
								/>
							</div>
							<p className="text-[11px] text-white/40 font-medium flex justify-between px-0.5">
								<span>
									{selectedCount} / {targetSize} names selected for tournament
								</span>
								{selectedCount < 2 && (
									<span className="text-amber-400/70 font-semibold animate-pulse">
										Need {2 - selectedCount} more
									</span>
								)}
							</p>
						</div>
					)}

					{/* Main Content Area - Grid or Swipe */}
					<AnimatePresence mode="wait">
						{filteredNames.length === 0 && !isLoading ? (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="py-20"
							>
								<EmptyState
									title="No Names Found"
									description="No names available for this criteria. Try clearing filters or adding some names!"
									icon="search_off"
									action={
										<Button
											variant="secondary"
											onClick={() => {
												handleFilterChange("filterStatus", "visible");
											}}
										>
											Reset Filters
										</Button>
									}
								/>
							</motion.div>
						) : isSwipeMode && isTournament && onStartTournament ? (
							/* Swipeable Cards Mode */
							<motion.div
								key="swipe-view"
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								className="flex-1 relative min-h-[500px]"
							>
								<SwipeableCards
									names={filteredNames}
									selectedNames={selectedNames}
									onToggleName={toggleName}
									showCatPictures={showCatPicturesGlobal}
									imageList={(tournamentProps.imageList as string[]) || []}
									onStartTournament={onStartTournament}
								/>
							</motion.div>
						) : (
							/* Grid Mode */
							<motion.div
								key="grid-view"
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								className="flex-1 relative min-h-[500px]"
							>
								<NameGrid
									names={filteredNames}
									selectedNames={selectedNames}
									onToggleName={toggleName}
									isLoading={isLoading}
									isAdmin={Boolean(profileProps.isAdmin)}
									showCatPictures={showCatPictures}
									imageList={tournamentProps.imageList as string[]}
									onNamesUpdate={(updater) => {
										setNames((previousNames) =>
											typeof updater === "function" ? updater(previousNames) : updater,
										);
									}}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Custom Extensions (e.g., Bulk Actions, Navigation) */}
				{extensions.bulkActions && (
					<div className="mt-8 pt-8 border-t border-white/10 animate-in fade-in duration-700">
						{React.isValidElement(extensions.bulkActions)
							? extensions.bulkActions
							: typeof extensions.bulkActions === "function"
								? React.createElement(extensions.bulkActions as React.ComponentType)
								: null}
					</div>
				)}
			</main>
		);
	},
);

ManagementMode.displayName = "ManagementMode";
