import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNameData, useNameSelection } from "@/hooks/useNames";
import { applyNameFilters, mapFilterStatusToVisibility } from "@/shared/lib/basic";
import { FILTER_OPTIONS } from "@/shared/lib/constants";
import type {
	NameItem,
	TournamentFilters,
	UseNameManagementViewProps,
	UseNameManagementViewResult,
} from "@/shared/types";
import useAppStore from "@/store/appStore";

export function useNameManagementView({
	mode,
	userName,
	profileProps = {},
	tournamentProps = {},
	analysisMode,
	setAnalysisMode,
	extensions = {},
}: UseNameManagementViewProps): UseNameManagementViewResult {
	const {
		names,
		isLoading,
		error: dataError,
		refetch,
		setNames,
	} = useNameData({ userName: userName ?? null, mode });

	const {
		selectedNames,
		selectedIds,
		toggleName,
		toggleNameById,
		toggleNamesByIds,
		selectAll: _selectAll,
		selectedCount,
		clearSelection,
		isSelected,
	} = useNameSelection({
		names,
		mode,
		userName: userName ?? null,
	});

	const { errors, ui, errorActions, tournamentActions, tournament } = useAppStore();

	// * Sync selection with global store for Navbar access
	useEffect(() => {
		if (mode === "tournament" && tournamentActions?.setSelection) {
			// Prevent infinite loop: Only update if selection actually changed
			const currentStoreSelection = tournament.selectedNames || [];
			const hasChanged =
				selectedNames.length !== currentStoreSelection.length ||
				selectedNames.some((n: NameItem, i: number) => n.id !== currentStoreSelection[i]?.id);

			if (hasChanged) {
				tournamentActions.setSelection(selectedNames);
			}
		}
	}, [selectedNames, tournamentActions, mode, tournament.selectedNames]);

	const isError = mode === "tournament" && (!!errors.current || !!dataError);
	const clearErrors =
		errorActions?.clearError ??
		(() => {
			// Intentional no-op: fallback when errorActions not available
		});

	const [showSelectedOnly, setShowSelectedOnly] = useState(false);

	const { isSwipeMode, showCatPictures } = ui;

	const [filterStatus, setFilterStatus] = useState<"all" | "visible" | "hidden">(
		FILTER_OPTIONS.VISIBILITY.VISIBLE,
	);
	const [localUserFilter, setLocalUserFilter] = useState("all");
	const userFilter = (profileProps.userFilter as "all" | "user" | "other") ?? localUserFilter;
	const setUserFilter =
		(profileProps.setUserFilter as React.Dispatch<
			React.SetStateAction<"all" | "user" | "other">
		>) ?? setLocalUserFilter;
	const [selectionFilter, setSelectionFilter] = useState<"all" | "selected" | "unselected">("all");
	const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
	const [activeTab, setActiveTab] = useState("manage");
	const [searchTerm, setSearchTerm] = useState("");

	const navigate = useNavigate();
	const location = useLocation();

	const handleAnalysisModeToggle = useCallback(() => {
		const newValue = !analysisMode;
		setAnalysisMode(newValue);

		const currentPath = location.pathname;
		const currentSearch = new URLSearchParams(location.search);

		if (newValue) {
			currentSearch.set("analysis", "true");
		} else {
			currentSearch.delete("analysis");
		}

		const newSearch = currentSearch.toString();
		const newUrl = newSearch ? `${currentPath}?${newSearch}` : currentPath;
		navigate(newUrl);
	}, [navigate, setAnalysisMode, analysisMode, location]);

	const filteredNamesForSwipe = useMemo(() => {
		if (mode !== "tournament") {
			return [];
		}
		const activeFilterStatus = analysisMode ? filterStatus : "visible";
		const activeVisibility = mapFilterStatusToVisibility(activeFilterStatus);

		let result = applyNameFilters(names, {
			visibility: activeVisibility,
			isAdmin: Boolean(profileProps.isAdmin),
		});

		if (searchTerm.trim()) {
			const normalizedSearch = searchTerm.trim().toLowerCase();
			result = result.filter((name) => {
				const content = `${name.name ?? ""} ${name.description ?? ""}`.toLowerCase();
				return content.includes(normalizedSearch);
			});
		}

		if (showSelectedOnly) {
			result = result.filter((name) => selectedNames.some((s: NameItem) => s.id === name.id));
		}

		return result;
	}, [
		names,
		mode,
		analysisMode,
		filterStatus,
		profileProps.isAdmin,
		searchTerm,
		showSelectedOnly,
		selectedNames,
	]);

	const filteredNames = useMemo(() => {
		const activeFilterStatus = mode === "tournament" && !analysisMode ? "visible" : filterStatus;
		const activeVisibility = mapFilterStatusToVisibility(activeFilterStatus);

		let result = applyNameFilters(names, {
			visibility: activeVisibility,
			isAdmin: Boolean(profileProps.isAdmin),
		});

		if (searchTerm.trim()) {
			const normalizedSearch = searchTerm.trim().toLowerCase();
			result = result.filter((name) => {
				const content = `${name.name ?? ""} ${name.description ?? ""}`.toLowerCase();
				return content.includes(normalizedSearch);
			});
		}

		// Apply additional filters
		if (selectionFilter !== "all") {
			if (selectionFilter === "selected") {
				result = result.filter((n) => isSelected(n));
			} else {
				result = result.filter((n) => !isSelected(n));
			}
		}

		return result;
	}, [
		names,
		mode,
		analysisMode,
		filterStatus,
		profileProps.isAdmin,
		selectionFilter,
		isSelected,
		searchTerm,
	]);

	const filterConfig: TournamentFilters = useMemo(() => {
		if (mode === "tournament" && analysisMode) {
			return {
				filterStatus: filterStatus as "all" | "visible" | "hidden",
				userFilter: userFilter as "all" | "user" | "other",
				selectionFilter: selectionFilter as "all" | "selected" | "unselected",
				dateFilter: dateFilter as "all" | "today" | "week" | "month",
				searchTerm,
			};
		} else if (mode === "tournament") {
			return {
				searchTerm,
			};
		} else {
			return {
				filterStatus: filterStatus as "all" | "visible" | "hidden",
				userFilter: userFilter as "all" | "user" | "other",
				selectionFilter: selectionFilter as "all" | "selected" | "unselected",
				searchTerm,
			};
		}
	}, [mode, filterStatus, userFilter, selectionFilter, dateFilter, analysisMode, searchTerm]);

	const handleFilterChange = useCallback(
		(name: keyof TournamentFilters, value: string | number | boolean) => {
			if (mode === "tournament" && analysisMode) {
				switch (name) {
					case "filterStatus":
						setFilterStatus(String(value) as "all" | "visible" | "hidden");
						break;
					case "userFilter":
						setUserFilter(String(value) as "all" | "user" | "other");
						break;
					case "selectionFilter":
						setSelectionFilter(String(value) as "all" | "selected" | "unselected");
						break;
					case "dateFilter":
						setDateFilter((String(value) as "all" | "today" | "week" | "month") || "all");
						break;
					case "searchTerm":
						setSearchTerm(String(value));
						break;
				}
			} else if (mode === "tournament") {
				// No filters for basic tournament mode
			} else {
				switch (name) {
					case "filterStatus":
						setFilterStatus(String(value) as "all" | "visible" | "hidden");
						break;
					case "userFilter":
						setUserFilter(String(value) as "all" | "user" | "other");
						break;
					case "selectionFilter":
						setSelectionFilter(String(value) as "all" | "selected" | "unselected");
						break;
					case "searchTerm":
						setSearchTerm(String(value));
						break;
				}
			}
		},
		[mode, analysisMode, setUserFilter],
	);

	// Stats calculation
	const stats = useMemo(
		() => ({
			total: names.length,
			visible: filteredNames.length,
			hidden: names.filter((n: NameItem) => n.is_hidden).length,
			selected: selectedCount,
		}),
		[names.length, filteredNames.length, selectedCount, names],
	);

	return {
		names,
		isLoading,
		isError,
		error: isError ? (dataError as Error) : null,
		dataError: dataError as Error | null,
		refetch,
		clearErrors,
		setNames,
		setHiddenIds: (ids: Set<string | number>) => {
			setNames((prev: NameItem[]) =>
				prev.map((n: NameItem) => ({
					...n,
					is_hidden: ids.has(n.id),
					isHidden: ids.has(n.id),
				})),
			);
		},

		selectedNames,
		selectedIds,
		isSelectionMode: false,
		setIsSelectionMode: () => {
			// Intentional no-op: selection mode not used in this context
		},
		toggleName,
		toggleNameById,
		toggleNamesByIds,
		clearSelection,
		selectAll: _selectAll,
		isSelected,
		selectedCount,

		filterStatus,
		setFilterStatus,
		showSelectedOnly,
		setShowSelectedOnly,
		selectionFilter,
		setSelectionFilter,
		userFilter,
		setUserFilter,
		dateFilter,
		setDateFilter,
		searchTerm,
		setSearchTerm,

		isSwipeMode,
		showCatPictures,

		activeTab,
		setActiveTab,

		filteredNames,
		filteredNamesForSwipe,
		stats,
		filterConfig,
		handleFilterChange,
		handleAnalysisModeToggle,

		// Additional properties
		profileProps,
		tournamentProps,
		analysisMode,
		setAnalysisMode,
		sortedNames: filteredNames, // Use filtered names as sorted names for now
		extensions,
	};
}
