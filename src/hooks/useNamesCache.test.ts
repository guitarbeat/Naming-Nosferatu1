import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NameItem } from "@/shared/types";
import { useNamesCache } from "./useNamesCache";

describe("useNamesCache", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("initializes with empty cache and returns null", () => {
		const { result } = renderHook(() => useNamesCache());

		expect(result.current.getCachedData(false)).toBeNull();
		expect(result.current.getCachedData(true)).toBeNull();
	});

	it("sets and gets cached data for different includeHidden parameters", () => {
		const { result } = renderHook(() => useNamesCache());

		const mockDataVisible: NameItem[] = [
			{
				id: "1",
				name: "Visible Cat",
				description: "Desc",
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

		const mockDataHidden: NameItem[] = [
			...mockDataVisible,
			{
				id: "2",
				name: "Hidden Cat",
				description: "Desc",
				isActive: true,
				isHidden: true,
				status: "candidate",
				provenance: [],
				avgRating: 1500,
				createdAt: null,
				pronunciation: undefined,
				lockedIn: false,
				has_user_rating: false,
			},
		];

		act(() => {
			result.current.setCachedData(mockDataVisible, false);
			result.current.setCachedData(mockDataHidden, true);
		});

		const retrievedVisible = result.current.getCachedData(false);
		expect(retrievedVisible).toHaveLength(1);
		expect(retrievedVisible?.[0]?.id).toBe("1");

		const retrievedHidden = result.current.getCachedData(true);
		expect(retrievedHidden).toHaveLength(2);
		expect(retrievedHidden?.[1]?.id).toBe("2");
	});

	it("expires cache after CACHE_TTL", () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useNamesCache());
		const mockData: NameItem[] = [
			{
				id: "1",
				name: "Visible Cat",
				description: "Desc",
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

		act(() => {
			result.current.setCachedData(mockData, false);
		});

		// Initially, it should be available
		expect(result.current.getCachedData(false)).toHaveLength(1);

		// Fast forward time slightly (4 mins)
		act(() => {
			vi.advanceTimersByTime(4 * 60 * 1000);
		});
		expect(result.current.getCachedData(false)).toHaveLength(1);

		// Fast forward past TTL (5 mins)
		act(() => {
			vi.advanceTimersByTime(2 * 60 * 1000); // Now 6 mins total
		});

		expect(result.current.getCachedData(false)).toBeNull();

		vi.useRealTimers();
	});

	it("invalidates cache correctly", () => {
		const { result } = renderHook(() => useNamesCache());
		const mockData: NameItem[] = [
			{
				id: "1",
				name: "Visible Cat",
				description: "Desc",
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

		act(() => {
			result.current.setCachedData(mockData, false);
		});

		expect(result.current.getCachedData(false)).toHaveLength(1);

		act(() => {
			result.current.invalidateCache();
		});

		expect(result.current.getCachedData(false)).toBeNull();
	});
});
