import { useCallback, useEffect, useRef } from "react";
import type { NameItem } from "@/shared/types";

interface SaverOptions {
	userName: string | null;
	enableAutoSave?: boolean;
}

interface SaverApiResult {
	scheduleSave: (selectedNames: NameItem[]) => void;
	loadSavedSelection: () => Array<string | number>;
}

function saveSelectionHash(selectedNames: NameItem[]): string {
	return selectedNames
		.map((n) => n.id)
		.sort()
		.join(",");
}

function isSaverOptions(value: NameItem[] | SaverOptions): value is SaverOptions {
	return !Array.isArray(value);
}

function useTournamentSelectionSaverLegacy(selectedNames: NameItem[]) {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSavedRef = useRef<string>("");

	useEffect(() => {
		// Clear any pending save
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Optimization: Move hash calculation inside the debounce timeout.
		// This ensures expensive operations (map/sort/join) are not performed
		// synchronously on every render, but only after the user has stopped interacting.
		saveTimeoutRef.current = setTimeout(() => {
			const selectionHash = saveSelectionHash(selectedNames);

			if (selectionHash === lastSavedRef.current) {
				return;
			}

			// Simulate save
			// console.log("Saving selection:", selectionHash);
			lastSavedRef.current = selectionHash;
		}, 1000);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [selectedNames]);

	return undefined;
}

function useTournamentSelectionSaverWithApi({
	userName,
	enableAutoSave = true,
}: SaverOptions): SaverApiResult {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSavedRef = useRef<string>("");

	const scheduleSave = useCallback(
		(selectedNames: NameItem[]) => {
			if (!userName || !enableAutoSave) {
				return;
			}

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			const selectionHash = saveSelectionHash(selectedNames);
			if (selectionHash === lastSavedRef.current) {
				return;
			}

			saveTimeoutRef.current = setTimeout(async () => {
				try {
					localStorage.setItem(
						`tournament_selection_${userName}`,
						JSON.stringify(selectedNames.map((n) => n.id)),
					);
					lastSavedRef.current = selectionHash;
				} catch (error) {
					console.error("Failed to save tournament selection:", error);
				}
			}, 1000);
		},
		[userName, enableAutoSave],
	);

	const loadSavedSelection = useCallback(() => {
		if (!userName) {
			return [];
		}
		try {
			const saved = localStorage.getItem(`tournament_selection_${userName}`);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	}, [userName]);

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return {
		scheduleSave,
		loadSavedSelection,
	};
}

export function useTournamentSelectionSaver(options: SaverOptions): SaverApiResult;
export function useTournamentSelectionSaver(selectedNames: NameItem[]): void;
export function useTournamentSelectionSaver(input: NameItem[] | SaverOptions): SaverApiResult | void {
	if (isSaverOptions(input)) {
		return useTournamentSelectionSaverWithApi(input);
	}
	return useTournamentSelectionSaverLegacy(input);
}
