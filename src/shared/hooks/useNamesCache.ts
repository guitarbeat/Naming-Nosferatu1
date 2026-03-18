/**
 * @module useNamesCache
 * @description Hook for caching and managing names data with TTL support
 */

import { useCallback, useEffect, useRef } from "react";
import type { NameItem } from "@/shared/types";
import { readStorageJson, writeStorageJson } from "@/shared/lib/storage";

interface CacheEntry {
	data: NameItem[];
	timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "names_cache_v2";

function isNameItemArray(value: unknown): value is NameItem[] {
	return Array.isArray(value);
}

function isCacheEntry(value: unknown): value is CacheEntry {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<CacheEntry>;
	return typeof candidate.timestamp === "number" && isNameItemArray(candidate.data);
}

export function useNamesCache() {
	const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

	const getCachedData = useCallback((includeHidden: boolean): NameItem[] | null => {
		const key = `${CACHE_KEY}_${includeHidden}`;
		const entry = cacheRef.current.get(key);

		if (!entry) {
			return null;
		}

		const now = Date.now();
		if (now - entry.timestamp > CACHE_TTL) {
			cacheRef.current.delete(key);
			return null;
		}

		return entry.data;
	}, []);

	const setCachedData = useCallback((data: NameItem[], includeHidden: boolean): void => {
		const key = `${CACHE_KEY}_${includeHidden}`;
		cacheRef.current.set(key, {
			data,
			timestamp: Date.now(),
		});

		// Persist to localStorage after updating cache
		const cacheObject = Object.fromEntries(cacheRef.current);
		writeStorageJson("names_cache_map", cacheObject);
	}, []);

	const invalidateCache = useCallback((): void => {
		cacheRef.current.clear();
	}, []);

	// Load cache from localStorage on mount
	useEffect(() => {
		const stored = readStorageJson("names_cache_map", {});

		if (!stored || typeof stored !== "object") {
			return;
		}

		const now = Date.now();
		for (const [key, entry] of Object.entries(stored as Record<string, unknown>)) {
			if (isCacheEntry(entry) && now - entry.timestamp <= CACHE_TTL) {
				cacheRef.current.set(key, entry);
			}
		}
	}, []);

	// No automatic persistence - cache is loaded on mount and users can manually call setCachedData
	// Manual persistence ensures we don't trigger renders during async operations

	return {
		getCachedData,
		setCachedData,
		invalidateCache,
	};
}
