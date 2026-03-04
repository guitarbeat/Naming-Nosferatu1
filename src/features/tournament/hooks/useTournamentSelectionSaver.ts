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

function isBrowser(): boolean {
	return typeof window !== "undefined";
}

function isSaverOptions(value: NameItem[] | SaverOptions): value is SaverOptions {
	return !Array.isArray(value);
}

export function useTournamentSelectionSaver(options: SaverOptions): SaverApiResult;
export function useTournamentSelectionSaver(selectedNames: NameItem[]): undefined;
export function useTournamentSelectionSaver(
	input: NameItem[] | SaverOptions,
): SaverApiResult | undefined {
	const options = isSaverOptions(input) ? input : null;
	const selectedNames = Array.isArray(input) ? input : null;
	const userName = options?.userName ?? null;
	const enableAutoSave = options?.enableAutoSave ?? true;

	const saveTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
	const lastSavedRef = useRef<string>("");

	const clearPendingSave = useCallback(() => {
		if (!saveTimeoutRef.current) {
			return;
		}
		clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = null;
	}, []);

	const scheduleSave = useCallback(
		(names: NameItem[]) => {
			if (!userName || !enableAutoSave || !isBrowser()) {
				return;
			}

			clearPendingSave();

			const selectionHash = saveSelectionHash(names);
			if (selectionHash === lastSavedRef.current) {
				return;
			}

			saveTimeoutRef.current = globalThis.setTimeout(() => {
				try {
					localStorage.setItem(
						`tournament_selection_${userName}`,
						JSON.stringify(names.map((n) => n.id)),
					);
					lastSavedRef.current = selectionHash;
				} catch (error) {
					console.error("Failed to save tournament selection:", error);
				}
			}, 1000);
		},
		[clearPendingSave, userName, enableAutoSave],
	);

	const loadSavedSelection = useCallback(() => {
		if (!userName || !isBrowser()) {
			return [];
		}
		try {
			const saved = localStorage.getItem(`tournament_selection_${userName}`);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	}, [userName]);

	useEffect(() => clearPendingSave, [clearPendingSave]);

	useEffect(() => {
		if (!selectedNames) {
			return;
		}

		clearPendingSave();

		saveTimeoutRef.current = globalThis.setTimeout(() => {
			const selectionHash = saveSelectionHash(selectedNames);
			if (selectionHash === lastSavedRef.current) {
				return;
			}
			lastSavedRef.current = selectionHash;
		}, 1000);

		return clearPendingSave;
	}, [clearPendingSave, selectedNames]);

	if (!options) {
		return undefined;
	}

	return {
		scheduleSave,
		loadSavedSelection,
	};
}
