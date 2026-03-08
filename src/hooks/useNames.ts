import { useCallback, useEffect, useMemo, useState } from "react";
import { coreAPI } from "@/services/supabase/client";
import { useLocalStorage } from "@/shared/hooks";
import type { NameItem } from "@/shared/types";

/* =========================================================================
   useNameData - Fetch and manage name data
   ========================================================================= */

interface UseNameDataProps {
	userName?: string | null;
	mode?: "tournament" | "profile";
}

interface UseNameDataResult {
	names: NameItem[];
	isLoading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
	setNames: (updater: NameItem[] | ((prev: NameItem[]) => NameItem[])) => void;
}

export function useNameData({ mode = "tournament" }: UseNameDataProps = {}): UseNameDataResult {
	const [names, setNamesState] = useState<NameItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const setNames = useCallback((updater: NameItem[] | ((prev: NameItem[]) => NameItem[])) => {
		setNamesState((previous) => (typeof updater === "function" ? updater(previous) : updater));
	}, []);

	const refetch = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const includeHidden = mode !== "tournament";
			const result = await coreAPI.getTrendingNames(includeHidden);
			setNamesState(Array.isArray(result) ? result : []);
		} catch (fetchError) {
			setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
			setNamesState([]);
		} finally {
			setIsLoading(false);
		}
	}, [mode]);

	useEffect(() => {
		void refetch();
	}, [refetch]);

	return {
		names,
		isLoading,
		error,
		refetch,
		setNames,
	};
}

/* =========================================================================
   useNameSelection - Selection state management for names
   ========================================================================= */

interface UseNameSelectionProps {
	names: NameItem[];
	mode?: "tournament" | "profile";
	userName?: string | null;
}

interface UseNameSelectionResult {
	selectedNames: NameItem[];
	selectedIds: Set<string | number>;
	selectedCount: number;
	toggleName: (name: NameItem) => void;
	toggleNameById: (id: string | number) => void;
	toggleNamesByIds: (ids: Array<string | number>) => void;
	selectAll: () => void;
	clearSelection: () => void;
	isSelected: (target: NameItem | string | number) => boolean;
}

export function useNameSelection({
	names,
	mode = "tournament",
	userName,
}: UseNameSelectionProps): UseNameSelectionResult {
	const storageKey = useMemo(
		() => `name_selection_${mode}_${userName ?? "anonymous"}`,
		[mode, userName],
	);

	// Use debounced localStorage hook to prevent main thread blocking on frequent updates
	const [selectedIdsArray, setSelectedIdsArray] = useLocalStorage<(string | number)[]>(
		storageKey,
		[],
		{ debounceWait: 500 },
	);

	// Memoize Set for O(1) lookups
	const selectedIds = useMemo(() => new Set(selectedIdsArray), [selectedIdsArray]);

	const selectedNames = useMemo(
		() => names.filter((name) => selectedIds.has(name.id)),
		[names, selectedIds],
	);

	const isSelected = useCallback(
		(target: NameItem | string | number) => {
			const id = typeof target === "object" ? target.id : target;
			return selectedIds.has(id);
		},
		[selectedIds],
	);

	const toggleNameById = useCallback(
		(id: string | number) => {
			setSelectedIdsArray((prevArray) => {
				const next = new Set(prevArray);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				return Array.from(next);
			});
		},
		[setSelectedIdsArray],
	);

	const toggleName = useCallback(
		(name: NameItem) => {
			toggleNameById(name.id);
		},
		[toggleNameById],
	);

	const toggleNamesByIds = useCallback(
		(ids: Array<string | number>) => {
			setSelectedIdsArray((prevArray) => {
				const next = new Set(prevArray);
				for (const id of ids) {
					if (next.has(id)) {
						next.delete(id);
					} else {
						next.add(id);
					}
				}
				return Array.from(next);
			});
		},
		[setSelectedIdsArray],
	);

	const clearSelection = useCallback(() => {
		setSelectedIdsArray([]);
	}, [setSelectedIdsArray]);

	const selectAll = useCallback(() => {
		setSelectedIdsArray(names.map((name) => name.id));
	}, [names, setSelectedIdsArray]);

	return {
		selectedNames,
		selectedIds,
		selectedCount: selectedNames.length,
		toggleName,
		toggleNameById,
		toggleNamesByIds,
		selectAll,
		clearSelection,
		isSelected,
	};
}

/* =========================================================================
   useNameSuggestion - Handle name suggestion form
   ========================================================================= */

interface UseNameSuggestionProps {
	onSuccess?: () => void;
}

interface UseNameSuggestionResult {
	values: {
		name: string;
		description: string;
	};
	errors: {
		name?: string;
		description?: string;
	};
	touched: {
		name?: boolean;
		description?: boolean;
	};
	isSubmitting: boolean;
	isValid: boolean;
	handleChange: (field: "name" | "description", value: string) => void;
	handleBlur: (field: "name" | "description") => void;
	handleSubmit: () => Promise<void>;
	reset: () => void;
	globalError: string;
	successMessage: string;
	setGlobalError: (error: string) => void;
}

export function useNameSuggestion(props: UseNameSuggestionProps = {}): UseNameSuggestionResult {
	const [values, setValues] = useState({ name: "", description: "" });
	const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
	const [touched, setTouched] = useState<{
		name?: boolean;
		description?: boolean;
	}>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [globalError, setGlobalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const handleChange = useCallback((field: "name" | "description", value: string) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
		setGlobalError("");
	}, []);

	const handleBlur = useCallback((field: "name" | "description") => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const validate = useCallback(() => {
		const nextErrors: { name?: string; description?: string } = {};
		if (!values.name.trim()) {
			nextErrors.name = "Name is required";
		}
		if (!values.description.trim()) {
			nextErrors.description = "Description is required";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [values]);

	const handleSubmit = useCallback(async () => {
		if (!validate()) {
			return;
		}

		setIsSubmitting(true);
		setGlobalError("");
		setSuccessMessage("");

		try {
			const result = await coreAPI.addName(values.name, values.description);

			if (!result.success) {
				throw new Error(result.error || "Failed to submit suggestion");
			}

			setSuccessMessage("Name suggestion submitted successfully!");
			setValues({ name: "", description: "" });
			setTouched({});
			props.onSuccess?.();
		} catch (submitError) {
			setGlobalError(
				submitError instanceof Error ? submitError.message : "Failed to submit suggestion",
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [props, validate, values.name, values.description]);

	const reset = useCallback(() => {
		setValues({ name: "", description: "" });
		setErrors({});
		setTouched({});
		setGlobalError("");
		setSuccessMessage("");
	}, []);

	const isValid = !errors.name && !errors.description && values.name.trim() !== "";

	return {
		values,
		errors,
		touched,
		isSubmitting,
		isValid,
		handleChange,
		handleBlur,
		handleSubmit,
		reset,
		globalError,
		successMessage,
		setGlobalError,
	};
}
