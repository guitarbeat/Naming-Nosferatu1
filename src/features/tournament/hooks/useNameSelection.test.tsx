import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NameItem } from "@/shared/types";
import { useNameSelection } from "./useNames";

const mockNames: NameItem[] = [
	{
		id: "1",
		name: "Cat 1",
		description: "Desc 1",
		isActive: true,
		isHidden: false,
		status: "candidate",
		provenance: [],
		avgRating: 1500,
		createdAt: null,
		pronunciation: undefined,
		lockedIn: false,
		has_user_rating: false,
	},
	{
		id: "2",
		name: "Cat 2",
		description: "Desc 2",
		isActive: true,
		isHidden: false,
		status: "candidate",
		provenance: [],
		avgRating: 1500,
		createdAt: null,
		pronunciation: undefined,
		lockedIn: false,
		has_user_rating: false,
	},
];

describe("useNameSelection", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("initializes with empty selection", () => {
		const { result } = renderHook(() => useNameSelection({ names: mockNames }));
		expect(result.current.selectedIds.size).toBe(0);
		expect(result.current.selectedNames).toHaveLength(0);
	});

	it("toggles name by id", () => {
		const { result } = renderHook(() => useNameSelection({ names: mockNames }));

		act(() => {
			result.current.toggleNameById("1");
		});

		expect(result.current.selectedIds.has("1")).toBe(true);
		expect(result.current.selectedNames).toHaveLength(1);
		expect(result.current.selectedNames[0]?.id).toBe("1");

		act(() => {
			result.current.toggleNameById("1");
		});

		expect(result.current.selectedIds.has("1")).toBe(false);
		expect(result.current.selectedNames).toHaveLength(0);
	});

	it("persists to localStorage with debounce", () => {
		vi.useFakeTimers();
		const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
		const { result } = renderHook(() =>
			useNameSelection({ names: mockNames, userName: "testuser" }),
		);

		act(() => {
			result.current.toggleNameById("1");
		});

		// Should NOT call setItem immediately due to debounce
		expect(setItemSpy).not.toHaveBeenCalled();

		// Fast forward time
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(setItemSpy).toHaveBeenCalled();
		expect(localStorage.getItem("name_selection_tournament_testuser")).toContain("1");

		vi.useRealTimers();
	});
});
