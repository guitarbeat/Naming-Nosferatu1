import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NameItem } from "@/shared/types";
import { CAT_IMAGES } from "./constants";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export function shuffleArray<T>(array: T[]): T[] {
	const next = [...array];
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = next[i] as T;
		next[i] = next[j] as T;
		next[j] = temp;
	}
	return next;
}

export function isNameHidden(name: NameItem | null | undefined): boolean {
	return name?.is_hidden === true || name?.isHidden === true;
}

export function isNameLocked(name: NameItem | null | undefined): boolean {
	return name?.locked_in === true || name?.lockedIn === true;
}

export function isNameActive(name: NameItem | null | undefined): boolean {
	return !isNameHidden(name) && !isNameLocked(name);
}

export function matchesNameSearchTerm(name: NameItem | null | undefined, searchTerm: string): boolean {
	const normalizedTerm = searchTerm.trim().toLowerCase();
	if (!normalizedTerm) {
		return true;
	}

	if (!name) {
		return false;
	}

	return (
		name.name.toLowerCase().includes(normalizedTerm) ||
		(name.description ?? "").toLowerCase().includes(normalizedTerm)
	);
}

export function getVisibleNames(names: NameItem[] | null | undefined): NameItem[] {
	if (!Array.isArray(names)) {
		return [];
	}
	return names.filter((name) => !isNameHidden(name));
}

export function getActiveNames(names: NameItem[] | null | undefined): NameItem[] {
	if (!Array.isArray(names)) {
		return [];
	}
	return names.filter(isNameActive);
}

export function getHiddenNames(names: NameItem[] | null | undefined): NameItem[] {
	if (!Array.isArray(names)) {
		return [];
	}
	return names.filter(isNameHidden);
}

export function getLockedNames(names: NameItem[] | null | undefined): NameItem[] {
	if (!Array.isArray(names)) {
		return [];
	}
	return names.filter(isNameLocked);
}

export function calculatePercentile(
	value: number,
	allValues: number[],
	higherIsBetter = true,
): number {
	if (Number.isNaN(value) || !allValues || allValues.length === 0) {
		return Number.isNaN(value) ? 0 : 50;
	}

	const validValues = allValues.filter((v) => v != null && !Number.isNaN(v));
	if (validValues.length === 0) {
		return 50;
	}

	const sorted = [...validValues].sort((a, b) => a - b);

	if (higherIsBetter) {
		const belowCount = sorted.filter((v) => v < value).length;
		return Math.round((belowCount / sorted.length) * 100);
	}

	const aboveCount = sorted.filter((v) => v > value).length;
	return Math.round((aboveCount / sorted.length) * 100);
}

const imageCache = new Map<string, string>();

function hashString(str: string): number {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i += 1) {
		hash ^= str.charCodeAt(i);
		hash *= 16777619;
	}
	return hash;
}

export function getRandomCatImage(
	id: string | number | null | undefined,
	images: readonly string[] = CAT_IMAGES,
): string {
	if (!id || images.length === 0) {
		return images[0] ?? "";
	}

	const cacheKey = `${id}-${images.length}`;
	const cached = imageCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const seed = typeof id === "string" ? hashString(id) : Number(id);
	const index = Math.abs(seed) % images.length;
	const selected = images[index] ?? images[0] ?? "";
	imageCache.set(cacheKey, selected);
	return selected;
}

export function hapticNavTap(): void {
	if (typeof navigator !== "undefined") {
		navigator.vibrate?.(10);
	}
}

export function hapticTournamentStart(): void {
	if (typeof navigator !== "undefined") {
		navigator.vibrate?.([50, 50, 50]);
	}
}
