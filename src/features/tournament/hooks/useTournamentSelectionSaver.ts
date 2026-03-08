import { useEffect, useRef } from "react";
import type { NameItem } from "@/shared/types";

export function useTournamentSelectionSaver(selectedNames: NameItem[]) {
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
			const selectionHash = selectedNames
				.map((n) => n.id)
				.sort()
				.join(",");

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
}
