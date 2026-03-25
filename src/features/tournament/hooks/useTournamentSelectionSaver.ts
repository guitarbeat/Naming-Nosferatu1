import { useCallback, useEffect, useRef } from "react";
import {
	isStorageAvailable,
	readStorageJson,
	writeStorageJson,
} from "@/shared/lib/storage";
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

function isSaverOptions(
	value: NameItem[] | SaverOptions,
): value is SaverOptions {
	return !Array.isArray(value);
}

export function useTournamentSelectionSaver(
	options: SaverOptions,
): SaverApiResult;
export function useTournamentSelectionSaver(
	selectedNames: NameItem[],
): undefined;
export function useTournamentSelectionSaver(
	input: NameItem[] | SaverOptions,
): SaverApiResult | undefined {
	const options = isSaverOptions(input) ? input : null;
	const selectedNames = Array.isArray(input) ? input : null;
	const userName = options?.userName ?? null;
	const enableAutoSave = options?.enableAutoSave ?? true;

	const saveTimeoutRef = useRef<ReturnType<
		typeof globalThis.setTimeout
	> | null>(null);
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
			if (!userName || !enableAutoSave || !isStorageAvailable()) {
				return;
			}

			clearPendingSave();

			const selectionHash = saveSelectionHash(names);
			if (selectionHash === lastSavedRef.current) {
				return;
			}

			saveTimeoutRef.current = globalThis.setTimeout(() => {
				writeStorageJson(
					`tournament_selection_${userName}`,
					names.map((n) => n.id),
				);
				lastSavedRef.current = selectionHash;
			}, 1000);
		},
		[clearPendingSave, userName, enableAutoSave],
	);

	const loadSavedSelection = useCallback(() => {
		if (!userName || !isStorageAvailable()) {
			return [];
		}

		return readStorageJson<Array<string | number>>(
			`tournament_selection_${userName}`,
			[],
		);
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
