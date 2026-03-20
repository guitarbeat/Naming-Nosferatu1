/**
 * @module AdvancedNameFilter
 * @description Advanced filtering and search component for name selection
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/shared/components/layout/Button";
import { ChevronDown, Clock, Filter, Search, Star, TrendingUp, X } from "@/shared/lib/icons";

export interface FilterOptions {
	searchTerm: string;
	categories: string[];
	minRating: number;
	maxRating: number;
	onlyFavorites: boolean;
	onlyRecentlyActive: boolean;
	sortBy: "name" | "rating" | "wins" | "recent";
	sortOrder: "asc" | "desc";
}

interface AdvancedNameFilterProps {
	names: any[];
	onFilterChange: (filters: FilterOptions) => void;
	onClearFilters: () => void;
	initialFilters?: Partial<FilterOptions>;
}

export function AdvancedNameFilter({
	names,
	onFilterChange,
	onClearFilters,
	initialFilters = {},
}: AdvancedNameFilterProps) {
	const [filters, setFilters] = useState<FilterOptions>({
		searchTerm: "",
		categories: [],
		minRating: 1000,
		maxRating: 3000,
		onlyFavorites: false,
		onlyRecentlyActive: false,
		sortBy: "name",
		sortOrder: "asc",
		...initialFilters,
	});

	const [isExpanded, setIsExpanded] = useState(false);

	// Extract unique categories from names
	const availableCategories = useMemo(() => {
		const categories = new Set<string>();
		names.forEach((name) => {
			if (name.categories) {
				name.categories.forEach((cat: string) => {
					categories.add(cat);
				});
			}
		});
		return Array.from(categories).sort();
	}, [names]);

	// Apply filters to names
	const filteredNames = useMemo(() => {
		return names.filter((name) => {
			// Search term filter
			if (filters.searchTerm.trim()) {
				const searchLower = filters.searchTerm.toLowerCase();
				const nameMatch = name.name.toLowerCase().includes(searchLower);
				const descMatch = name.description?.toLowerCase().includes(searchLower);
				if (!nameMatch && !descMatch) {
					return false;
				}
			}

			// Category filter
			if (filters.categories.length > 0) {
				if (!name.categories || !filters.categories.some((cat) => name.categories.includes(cat))) {
					return false;
				}
			}

			// Rating range filter
			const rating = name.avgRating || 1500;
			if (rating < filters.minRating || rating > filters.maxRating) {
				return false;
			}

			// Favorites filter
			if (filters.onlyFavorites && !name.isFavorite) {
				return false;
			}

			// Recently active filter
			if (filters.onlyRecentlyActive) {
				const lastActive = new Date(name.lastActiveAt || "");
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				if (lastActive < weekAgo) {
					return false;
				}
			}

			return true;
		});
	}, [names, filters]);

	// Sort filtered names
	const _sortedNames = useMemo(() => {
		const sorted = [...filteredNames];

		sorted.sort((a, b) => {
			let comparison = 0;

			switch (filters.sortBy) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "rating":
					comparison = (a.avgRating || 1500) - (b.avgRating || 1500);
					break;
				case "wins":
					comparison = (a.wins || 0) - (b.wins || 0);
					break;
				case "recent":
					comparison =
						new Date(b.lastActiveAt || "0").getTime() - new Date(a.lastActiveAt || "0").getTime();
					break;
			}

			return filters.sortOrder === "desc" ? -comparison : comparison;
		});

		return sorted;
	}, [filteredNames, filters.sortBy, filters.sortOrder]);

	const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}, []);

	const clearAllFilters = useCallback(() => {
		setFilters({
			searchTerm: "",
			categories: [],
			minRating: 1000,
			maxRating: 3000,
			onlyFavorites: false,
			onlyRecentlyActive: false,
			sortBy: "name",
			sortOrder: "asc",
		});
		onClearFilters();
	}, [onClearFilters]);

	// Notify parent of filter changes
	useEffect(() => {
		onFilterChange(filters);
	}, [filters, onFilterChange]);

	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.searchTerm) {
			count++;
		}
		if (filters.categories.length > 0) {
			count++;
		}
		if (filters.minRating > 1000 || filters.maxRating < 3000) {
			count++;
		}
		if (filters.onlyFavorites) {
			count++;
		}
		if (filters.onlyRecentlyActive) {
			count++;
		}
		return count;
	}, [filters]);

	return (
		<div className="bg-card border border-border rounded-lg p-4 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Filter className="text-chart-4" size={20} />
					<h3 className="text-lg font-semibold text-foreground">Advanced Filters</h3>
				</div>
				<Button
					variant="ghost"
					size="small"
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-chart-4 hover:text-chart-4/80"
				>
					<ChevronDown
						className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
						size={16}
					/>
				</Button>
			</div>

			{/* Expandable Filter Content */}
			{isExpanded && (
				<div className="space-y-4 pt-4 border-t border-border/10">
					{/* Search */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							<Search className="inline mr-2" size={16} />
							Search Names
						</label>
						<div className="relative">
							<input
								type="text"
								value={filters.searchTerm}
								onChange={(e) => updateFilter("searchTerm", e.target.value)}
								placeholder="Search by name or description..."
								className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground pr-10"
							/>
							{filters.searchTerm && (
								<button
									onClick={() => updateFilter("searchTerm", "")}
									className="absolute right-2 top-1/2 text-chart-4 hover:text-chart-4/80"
								>
									<X size={16} />
								</button>
							)}
						</div>
					</div>

					{/* Categories */}
					{availableCategories.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">Categories</label>
							<div className="flex flex-wrap gap-2">
								{availableCategories.map((category) => (
									<button
										key={category}
										onClick={() => {
											const newCategories = filters.categories.includes(category)
												? filters.categories.filter((c) => c !== category)
												: [...filters.categories, category];
											updateFilter("categories", newCategories);
										}}
										className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
											filters.categories.includes(category)
												? "bg-chart-4 text-white"
												: "bg-foreground/10 text-foreground hover:bg-foreground/20"
										}`}
									>
										{category}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Rating Range */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Rating Range ({filters.minRating} - {filters.maxRating})
						</label>
						<div className="flex items-center gap-4">
							<div className="flex-1">
								<label className="text-xs text-muted-foreground">Min</label>
								<input
									type="range"
									min="1000"
									max="3000"
									step="50"
									value={filters.minRating}
									onChange={(e) => updateFilter("minRating", parseInt(e.target.value, 10))}
									className="w-full"
								/>
								<div className="text-xs text-center text-muted-foreground">{filters.minRating}</div>
							</div>
							<div className="flex-1">
								<label className="text-xs text-muted-foreground">Max</label>
								<input
									type="range"
									min="1000"
									max="3000"
									step="50"
									value={filters.maxRating}
									onChange={(e) => updateFilter("maxRating", parseInt(e.target.value, 10))}
									className="w-full"
								/>
								<div className="text-xs text-center text-muted-foreground">{filters.maxRating}</div>
							</div>
						</div>
					</div>

					{/* Quick Filters */}
					<div className="flex gap-2">
						<button
							onClick={() => updateFilter("onlyFavorites", !filters.onlyFavorites)}
							className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
								filters.onlyFavorites
									? "bg-chart-4 text-white"
									: "bg-foreground/10 text-foreground hover:bg-foreground/20"
							}`}
						>
							<Star size={16} />
							Favorites Only
						</button>

						<button
							onClick={() => updateFilter("onlyRecentlyActive", !filters.onlyRecentlyActive)}
							className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
								filters.onlyRecentlyActive
									? "bg-chart-4 text-white"
									: "bg-foreground/10 text-foreground hover:bg-foreground/20"
							}`}
						>
							<Clock size={16} />
							Recent Only
						</button>
					</div>

					{/* Sort Options */}
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							<TrendingUp className="inline mr-2" size={16} />
							Sort By
						</label>
						<div className="flex gap-2">
							<select
								value={filters.sortBy}
								onChange={(e) => updateFilter("sortBy", e.target.value as any)}
								className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
							>
								<option value="name">Name</option>
								<option value="rating">Rating</option>
								<option value="wins">Wins</option>
								<option value="recent">Recently Active</option>
							</select>
							<select
								value={filters.sortOrder}
								onChange={(e) => updateFilter("sortOrder", e.target.value as any)}
								className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
							>
								<option value="asc">Ascending</option>
								<option value="desc">Descending</option>
							</select>
						</div>
					</div>

					{/* Clear Filters */}
					<div className="flex justify-between items-center pt-4 border-t border-border/10">
						<div className="text-sm text-muted-foreground">
							{filteredNames.length} of {names.length} names shown
							{activeFilterCount > 0 && (
								<span className="ml-2">({activeFilterCount} filters active)</span>
							)}
						</div>
						<Button
							onClick={clearAllFilters}
							variant="ghost"
							size="small"
							className="text-chart-4 hover:text-chart-4/80"
						>
							<X size={16} className="mr-1" />
							Clear All
						</Button>
					</div>
				</div>
			)}

			{/* Quick Stats */}
			{!isExpanded && (
				<div className="pt-4 border-t border-border/10">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
						<div>
							<span className="font-medium text-foreground">Total Names:</span>
							<span className="ml-1">{names.length}</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Filtered:</span>
							<span className="ml-1">{filteredNames.length}</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Categories:</span>
							<span className="ml-1">{availableCategories.length}</span>
						</div>
						<div>
							<span className="font-medium text-foreground">Avg Rating:</span>
							<span className="ml-1">
								{Math.round(
									filteredNames.reduce((sum, name) => sum + (name.avgRating || 1500), 0) /
										filteredNames.length,
								)}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
