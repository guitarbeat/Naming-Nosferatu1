import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NameItem } from "@/shared/types";
import { useTournamentSelectionSaver } from "./useTournamentSelectionSaver";

const mockNames: NameItem[] = [
	{ id: 1, name: "Mittens", userId: 1, lastUsed: null, createdAt: new Date() },
	{ id: 2, name: "Luna", userId: 1, lastUsed: null, createdAt: new Date() },
];

describe("useTournamentSelectionSaver", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("with SaverOptions (API signature)", () => {
		it("returns scheduleSave and loadSavedSelection functions", () => {
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			// result.current is SaverApiResult | undefined.
			// With options, it should be SaverApiResult.
			expect(result.current).toBeDefined();
			expect(typeof result.current?.scheduleSave).toBe("function");
			expect(typeof result.current?.loadSavedSelection).toBe("function");
		});

		it("scheduleSave correctly writes to localStorage after 1000ms delay", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			result.current?.scheduleSave(mockNames);

			// Should not have been called immediately
			expect(setItemSpy).not.toHaveBeenCalled();

			// Advance time by 999ms, still should not be called
			vi.advanceTimersByTime(999);
			expect(setItemSpy).not.toHaveBeenCalled();

			// Advance the remaining 1ms
			vi.advanceTimersByTime(1);
			expect(setItemSpy).toHaveBeenCalledWith(
				"tournament_selection_testuser",
				JSON.stringify([1, 2]), // mockNames mapped to their IDs
			);
		});

		it("scheduleSave debounces multiple rapid calls", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			result.current?.scheduleSave([mockNames[0]]);
			vi.advanceTimersByTime(500); // Wait 500ms

			// Call again before the first 1000ms is up
			result.current?.scheduleSave(mockNames);
			vi.advanceTimersByTime(500); // 1000ms since first call, but 500ms since second

			// Still should not have been called because of debounce
			expect(setItemSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(500); // 1000ms since second call

			// Now it should be called once, with the latest arguments
			expect(setItemSpy).toHaveBeenCalledTimes(1);
			expect(setItemSpy).toHaveBeenCalledWith(
				"tournament_selection_testuser",
				JSON.stringify([1, 2]),
			);
		});

		it("does not save if the selection hash has not changed", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			result.current?.scheduleSave(mockNames);
			vi.advanceTimersByTime(1000);
			expect(setItemSpy).toHaveBeenCalledTimes(1);

			setItemSpy.mockClear();

			// Call again with same selection
			result.current?.scheduleSave(mockNames);
			vi.advanceTimersByTime(1000);

			// Should not save again because hash is identical
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("does not save if enableAutoSave is false", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() =>
				useTournamentSelectionSaver({
					userName: "testuser",
					enableAutoSave: false,
				}),
			);

			result.current?.scheduleSave(mockNames);
			vi.advanceTimersByTime(1000);

			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("does not save if userName is null", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: null }));

			result.current?.scheduleSave(mockNames);
			vi.advanceTimersByTime(1000);

			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("loadSavedSelection returns empty array if no saved selection exists", () => {
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			const saved = result.current?.loadSavedSelection();
			expect(saved).toEqual([]);
		});

		it("loadSavedSelection correctly loads and parses from localStorage", () => {
			localStorage.setItem("tournament_selection_testuser", JSON.stringify([1, 2]));

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			const saved = result.current?.loadSavedSelection();
			expect(saved).toEqual([1, 2]);
		});

		it("loadSavedSelection handles JSON parsing errors gracefully", () => {
			localStorage.setItem("tournament_selection_testuser", "invalid json[}");

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			const saved = result.current?.loadSavedSelection();
			expect(saved).toEqual([]); // Fallback to empty array
		});

		it("loadSavedSelection returns empty array if userName is null", () => {
			localStorage.setItem("tournament_selection_testuser", JSON.stringify([1, 2]));

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: null }));

			const saved = result.current?.loadSavedSelection();
			expect(saved).toEqual([]);
		});
	});

	describe("with NameItem[] (useEffect side-effect signature)", () => {
		it("returns undefined but updates hash reference behind the scenes without setting localStorage", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver(mockNames));

			// Should return undefined when an array of NameItem is passed
			expect(result.current).toBeUndefined();

			// Should have scheduled a timer that doesn't save to localStorage but updates the ref
			vi.advanceTimersByTime(1000);

			// Importantly, the effect signature should NOT actually call localStorage.setItem
			// because that logic is only in the scheduleSave callback. The effect just updates lastSavedRef.current
			expect(setItemSpy).not.toHaveBeenCalled();
		});
	});
});
