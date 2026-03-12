import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NameItem } from "@/shared/types";
import { useTournamentSelectionSaver } from "./useTournamentSelectionSaver";

const mockNames: NameItem[] = [
	{ id: 1, name: "Mittens" },
	{ id: 2, name: "Luna" },
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

	describe("with SaverOptions input", () => {
		it("returns scheduleSave and loadSavedSelection functions", () => {
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			expect(result.current).toBeDefined();
			expect(typeof result.current?.scheduleSave).toBe("function");
			expect(typeof result.current?.loadSavedSelection).toBe("function");
		});

		it("saves the selection after the debounce interval", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			act(() => {
				result.current?.scheduleSave(mockNames);
			});

			vi.advanceTimersByTime(999);
			expect(setItemSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(setItemSpy).toHaveBeenCalledWith(
				"tournament_selection_testuser",
				JSON.stringify([1, 2]),
			);
		});

		it("debounces repeated save requests", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			act(() => {
				result.current?.scheduleSave([mockNames[0] as NameItem]);
			});
			vi.advanceTimersByTime(500);

			act(() => {
				result.current?.scheduleSave(mockNames);
			});
			vi.advanceTimersByTime(500);
			expect(setItemSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(500);
			expect(setItemSpy).toHaveBeenCalledTimes(1);
			expect(setItemSpy).toHaveBeenCalledWith(
				"tournament_selection_testuser",
				JSON.stringify([1, 2]),
			);
		});

		it("does not save when the selection hash is unchanged", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			act(() => {
				result.current?.scheduleSave(mockNames);
			});
			vi.advanceTimersByTime(1000);
			expect(setItemSpy).toHaveBeenCalledTimes(1);

			setItemSpy.mockClear();

			act(() => {
				result.current?.scheduleSave(mockNames);
			});
			vi.advanceTimersByTime(1000);
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("does not save when auto-save is disabled", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() =>
				useTournamentSelectionSaver({ userName: "testuser", enableAutoSave: false }),
			);

			act(() => {
				result.current?.scheduleSave(mockNames);
			});
			vi.advanceTimersByTime(1000);
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("does not save when there is no user name", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: null }));

			act(() => {
				result.current?.scheduleSave(mockNames);
			});
			vi.advanceTimersByTime(1000);
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it("returns an empty array when there is no saved selection", () => {
			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			expect(result.current?.loadSavedSelection()).toEqual([]);
		});

		it("loads a saved selection from localStorage", () => {
			localStorage.setItem("tournament_selection_testuser", JSON.stringify([1, 2]));

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			expect(result.current?.loadSavedSelection()).toEqual([1, 2]);
		});

		it("handles invalid saved JSON gracefully", () => {
			localStorage.setItem("tournament_selection_testuser", "invalid json[}");

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: "testuser" }));

			expect(result.current?.loadSavedSelection()).toEqual([]);
		});

		it("returns an empty array when loading without a user name", () => {
			localStorage.setItem("tournament_selection_testuser", JSON.stringify([1, 2]));

			const { result } = renderHook(() => useTournamentSelectionSaver({ userName: null }));

			expect(result.current?.loadSavedSelection()).toEqual([]);
		});
	});

	describe("with NameItem[] input", () => {
		it("returns undefined and only updates the internal hash", () => {
			const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
			const { result } = renderHook(() => useTournamentSelectionSaver(mockNames));

			expect(result.current).toBeUndefined();

			vi.advanceTimersByTime(1000);
			expect(setItemSpy).not.toHaveBeenCalled();
		});
	});
});
