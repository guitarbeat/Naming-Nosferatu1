/**
 * @module basic
 * @description Consolidated utility functions: arrays, dates, logging, display,
 * names/filtering, ratings, cat images, CSV export, caching, image compression,
 * haptics, sound, and className merging.
 *
 * All types that were previously imported from external modules are defined
 * inline so this file has zero project-specific import dependencies beyond
 * its sibling `./constants`.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { queryClient } from "@/services/supabase/client";
import type { NameItem } from "@/shared/types";
import { CAT_IMAGES, STORAGE_KEYS } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal interface for query-cache consumers (e.g. TanStack Query). */

// ═══════════════════════════════════════════════════════════════════════════════
// Class Names
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge class names with Tailwind-aware conflict resolution.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 * cn("text-red-500", "text-blue-500") // → "text-blue-500"
 */
export function cn(...inputs: ClassValue[]): string {
        return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Array Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // biome-ignore lint/style/noNonNullAssertion: Array indices are guaranteed valid within loop bounds
                const swapTemp = newArray[i]!;
                // biome-ignore lint/style/noNonNullAssertion: Array indices are guaranteed valid within loop bounds
                newArray[i] = newArray[j]!;
                newArray[j] = swapTemp;
        }
        return newArray;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Date Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a date with localization support
 */
export function formatDate(
        date: Date | string | number,
        options: Intl.DateTimeFormatOptions = {},
): string {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
                return "Invalid Date";
        }
        return d.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                ...options,
        });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Display Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format rank number with medal emoji for display
 */
export function getRankDisplay(rank: number): string {
        if (rank === 1) {
                return "🥇 1st";
        }
        if (rank === 2) {
                return "🥈 2nd";
        }
        if (rank === 3) {
                return "🥉 3rd";
        }
        if (rank <= 10) {
                return `🏅 ${rank}th`;
        }
        return `${rank}th`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════════════════════

const isDev = import.meta.env?.DEV || process.env.NODE_ENV === "development";

/**
 * No-op function for conditional logging
 */
const noop = (..._args: unknown[]) => {
        // Intentional no-op function
};

/**
 * Development-only logging utilities
 * Only log when NODE_ENV is "development"
 */
export const devLog = isDev ? (...args: unknown[]) => console.log("[DEV]", ...args) : noop;
export const devWarn = isDev ? (...args: unknown[]) => console.warn("[DEV]", ...args) : noop;
export const devError = isDev ? (...args: unknown[]) => console.error("[DEV]", ...args) : noop;

// ═══════════════════════════════════════════════════════════════════════════════
// Name / Filter Utilities
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilterOptions {
        visibility?: "visible" | "hidden" | "all";
        isAdmin?: boolean;
}

/** Check whether a name entry is marked as hidden (handles both casing conventions). */
export function isNameHidden(name: NameItem | null | undefined): boolean {
        return name?.is_hidden === true || name?.isHidden === true;
}

/** Shorthand: return only visible (non-hidden) names. */
export function getVisibleNames(names: NameItem[] | null | undefined): NameItem[] {
        if (!Array.isArray(names)) {
                return [];
        }
        return names.filter((n) => !isNameHidden(n));
}

/**
 * Map filterStatus to visibility string
 */
export function mapFilterStatusToVisibility(filterStatus: string): "hidden" | "all" | "visible" {
        if (filterStatus === "hidden") {
                return "hidden";
        }
        if (filterStatus === "all") {
                return "all";
        }
        return "visible";
}

/**
 * Internal visibility filter
 */
function filterByVisibility(
        names: NameItem[] | null | undefined,
        {
                visibility = "visible",
                isAdmin = false,
        }: { visibility?: "visible" | "hidden" | "all"; isAdmin?: boolean } = {},
): NameItem[] {
        if (!Array.isArray(names)) {
                return [];
        }
        if (!isAdmin) {
                return names.filter((n) => !isNameHidden(n));
        }

        switch (visibility) {
                case "hidden":
                        return names.filter((n) => isNameHidden(n));
                case "all":
                        return names;
                default:
                        return names.filter((n) => !isNameHidden(n));
        }
}

/**
 * Apply visibility filter to names
 */
export function applyNameFilters(
        names: NameItem[] | null | undefined,
        filters: FilterOptions = {},
): NameItem[] {
        const { visibility = "visible", isAdmin = false } = filters;

        if (!names || !Array.isArray(names)) {
                return [];
        }
        return filterByVisibility([...names], { visibility, isAdmin });
}

/**
 * Converts an array of selected names to a Set of IDs for O(1) lookup.
 */
export function selectedNamesToSet(
        selectedNames: NameItem[] | Set<string | number>,
): Set<string | number> {
        if (selectedNames instanceof Set) {
                return selectedNames;
        }
        return new Set(selectedNames.map((n) => n.id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rating / Metrics Utilities
// ═══════════════════════════════════════════════════════════════════════════════

const METRIC_LABELS: Record<string, string> = {
        rating: "Rating",
        total_wins: "Wins",
        selected: "Selected",
        avg_rating: "Avg Rating",
        wins: "Wins",
        dateSubmitted: "Date Added",
        win_rate: "Win %",
};

export function getMetricLabel(metricKey: string): string {
        return METRIC_LABELS[metricKey] || metricKey;
}

/**
 * Calculate the percentile rank of a value within a dataset
 */
export function calculatePercentile(
        value: number,
        allValues: number[],
        higherIsBetter = true,
): number {
        if (!allValues || allValues.length === 0) {
                return 50;
        }

        const validValues = allValues.filter((v) => v != null && !Number.isNaN(v));
        if (validValues.length === 0) {
                return 50;
        }

        const sorted = [...validValues].sort((a, b) => a - b);

        if (higherIsBetter) {
                const belowCount = sorted.filter((v) => v < value).length;
                return Math.round((belowCount / sorted.length) * 100);
        } else {
                const aboveCount = sorted.filter((v) => v > value).length;
                return Math.round((aboveCount / sorted.length) * 100);
        }
}

export interface RatingData {
        rating: number;
        wins: number;
        losses: number;
}

export interface RatingItem extends RatingData {
        name: string;
}

export interface RatingDataInput {
        rating: number;
        wins?: number;
        losses?: number;
}

/**
 * Convert ratings object/array to standardized array format
 */
export function ratingsToArray(
        ratings: Record<string, RatingDataInput | number> | RatingItem[],
): RatingItem[] {
        if (Array.isArray(ratings)) {
                return ratings;
        }

        return Object.entries(ratings).map(([name, data]) => ({
                name,
                rating: typeof data === "number" ? data : (data as RatingDataInput)?.rating || 1500,
                wins: typeof data === "object" ? (data as RatingDataInput)?.wins || 0 : 0,
                losses: typeof data === "object" ? (data as RatingDataInput)?.losses || 0 : 0,
        }));
}

/**
 * Convert ratings array to object format
 */
export function ratingsToObject(ratingsArray: RatingItem[]): Record<string, RatingData> {
        if (!Array.isArray(ratingsArray)) {
                return {};
        }

        return ratingsArray.reduce(
                (acc, item) => {
                        acc[item.name] = {
                                rating: item.rating || 1500,
                                wins: item.wins || 0,
                                losses: item.losses || 0,
                        };
                        return acc;
                },
                {} as Record<string, RatingData>,
        );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cat Image Utilities
// ═══════════════════════════════════════════════════════════════════════════════

interface CatImage {
        id: string;
        url: string;
        width: number;
        height: number;
}

const FALLBACK_CAT_AVATARS = [
        "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=150&h=150&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=150&h=150&fit=crop&crop=face",
];

export const fetchCatAvatars = async (count = 6): Promise<string[]> => {
        try {
                const response = await fetch(
                        `https://api.thecatapi.com/v1/images/search?limit=${count}&size=thumb`,
                );
                if (!response.ok) {
                        throw new Error("Failed to fetch cat images");
                }
                const cats = await response.json();
                return cats.map((cat: CatImage) => cat.url);
        } catch {
                return FALLBACK_CAT_AVATARS;
        }
};

// Cache for memoization to avoid redundant hash calculations
const imageCache = new Map<string, string>();

/**
 * Robust hash function using FNV-1a algorithm for better distribution
 */
function hashString(str: string): number {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash *= 16777619;
        }
        return hash;
}

/** Deterministic image selection based on a seed id with memoization. */
export function getRandomCatImage(
        id: string | number | null | undefined,
        images: readonly string[] = CAT_IMAGES,
): string {
        if (!id || images.length === 0) {
                return images[0] ?? "";
        }

        const cacheKey = `${id}-${images.length}`;

        // Check cache first
        if (imageCache.has(cacheKey)) {
                const cached = imageCache.get(cacheKey);
                return cached || images[0] || "";
        }

        const seed = typeof id === "string" ? hashString(id) : Number(id);
        const index = Math.abs(seed) % images.length;
        const selectedImage = images[index] ?? images[0] ?? "";

        // Cache the result
        imageCache.set(cacheKey, selectedImage);

        return selectedImage;
}

/**
 * Load an image from a file and return as HTMLImageElement
 */
async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
                if (typeof window === "undefined") {
                        reject(new Error("Browser environment required"));
                        return;
                }
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                        URL.revokeObjectURL(url);
                        resolve(img);
                };
                img.onerror = (e) => {
                        URL.revokeObjectURL(url);
                        reject(e);
                };
                img.src = url;
        });
}

/**
 * Compress an image file to WebP format with size constraints
 */
export async function compressImageFile(
        file: File,
        {
                maxWidth = 1600,
                maxHeight = 1600,
                quality = 0.8,
        }: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
        try {
                if (typeof document === "undefined") {
                        return file;
                }
                const img = await loadImageFromFile(file);
                const { width, height } = img;
                const scale = Math.min(maxWidth / width, maxHeight / height, 1);
                const targetW = Math.round(width * scale);
                const targetH = Math.round(height * scale);

                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d", { alpha: true });
                if (!ctx) {
                        return file;
                }
                ctx.drawImage(img, 0, 0, targetW, targetH);

                const blob = await new Promise<Blob | null>((resolve) =>
                        canvas.toBlob(resolve, "image/webp", Math.min(Math.max(quality, 0.1), 0.95)),
                );
                if (!blob) {
                        return file;
                }

                const base = file.name.replace(/\.[^.]+$/, "") || "image";
                return new File([blob], `${base}.webp`, { type: "image/webp" });
        } catch {
                return file;
        }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════════════════════════════════════

/** Trigger a file download in the browser. */
function downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = Object.assign(document.createElement("a"), {
                href: url,
                download: filename,
                style: "display:none",
        });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
}

/**
 * Export tournament rankings as a CSV file.
 *
 * @example
 * exportTournamentResultsToCSV(rankings, "finals-2024.csv");
 */
export function exportTournamentResultsToCSV(rankings: NameItem[], filename?: string): void {
        if (rankings.length === 0) {
                return;
        }

        const headers = ["Name", "Rating", "Wins", "Losses"];
        const rows = rankings.map((r) =>
                [
                        `"${(r.name ?? "").replace(/"/g, '""')}"`, // escape embedded quotes
                        Math.round(Number(r.rating ?? 1500)),
                        r.wins ?? 0,
                        r.losses ?? 0,
                ].join(","),
        );

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const name = filename ?? `cat_names_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadBlob(blob, name);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clear tournament-related query cache
 */
export function clearTournamentCache(): boolean {
        try {
                queryClient.removeQueries({ queryKey: ["tournament"] });
                queryClient.removeQueries({ queryKey: ["catNames"] });
                return true;
        } catch (error) {
                console.error("Error clearing tournament cache:", error);
                return false;
        }
}

/**
 * Clear all caches including local storage
 */
export function clearAllCaches(): boolean {
        try {
                queryClient.clear();
                localStorage.removeItem(STORAGE_KEYS.TOURNAMENT);
                return true;
        } catch (error) {
                console.error("Error clearing all caches:", error);
                return false;
        }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Image Compression
// ═══════════════════════════════════════════════════════════════════════════════

/** Load a `File` into an `HTMLImageElement` (browser only). */

// ═══════════════════════════════════════════════════════════════════════════════
// Haptic Feedback
// ═══════════════════════════════════════════════════════════════════════════════

/** Short single-tap vibration for navigation actions. */
export function hapticNavTap(): void {
        if (typeof navigator !== "undefined") {
                navigator.vibrate?.(10);
        }
}

/** Pattern vibration for tournament start. */
export function hapticTournamentStart(): void {
        if (typeof navigator !== "undefined") {
                navigator.vibrate?.([50, 50, 50]);
        }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Performance Utilities
// ═══════════════════════════════════════════════════════════════════════════════

interface PerformanceMetrics {
        fcp?: number;
        lcp?: number;
        fid?: number;
        cls?: number;
        domContentLoaded?: number;
        loadComplete?: number;
        serverResponseTime?: number;
}

const metrics: PerformanceMetrics = {};
const observers: PerformanceObserver[] = [];

/**
 * Report navigation timing using the Navigation Timing Level 2 API.
 * (The legacy `performance.timing` property is deprecated.)
 */
function reportNavigationMetrics(): void {
        const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        const nav = entries[0];
        if (!nav) {
                return;
        }

        metrics.domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
        metrics.loadComplete = Math.round(nav.loadEventEnd);
        metrics.serverResponseTime = Math.round(nav.responseEnd - nav.requestStart);

        console.debug(`[Perf] DOM Content Loaded: ${metrics.domContentLoaded}ms`);
        console.debug(`[Perf] Page Load Complete: ${metrics.loadComplete}ms`);
        console.debug(`[Perf] Server Response: ${metrics.serverResponseTime}ms`);
}

/**
 * Safely create and register a `PerformanceObserver` for a single entry type.
 * Returns silently if the entry type isn't supported in the current browser.
 */
function observeWebVital(type: string, callback: (entries: PerformanceEntryList) => void): void {
        try {
                const observer = new PerformanceObserver((list) => callback(list.getEntries()));
                observer.observe({ type, buffered: true });
                observers.push(observer);
        } catch {
                console.debug(`[Perf] "${type}" observer not supported`);
        }
}

/** Start collecting Web Vitals and navigation metrics (dev only). */
export function initializePerformanceMonitoring(): void {
        if (!isDev || typeof window === "undefined") {
                return;
        }

        // Navigation timing (after full page load)
        window.addEventListener("load", () => setTimeout(reportNavigationMetrics, 0), { once: true });

        if (!("PerformanceObserver" in window)) {
                return;
        }

        // First Contentful Paint
        observeWebVital("paint", (entries) => {
                const fcp = entries.find((e) => e.name === "first-contentful-paint");
                if (fcp) {
                        metrics.fcp = Math.round(fcp.startTime);
                        console.debug(`[Perf] FCP: ${metrics.fcp}ms`);
                }
        });

        // Largest Contentful Paint
        observeWebVital("largest-contentful-paint", (entries) => {
                const last = entries[entries.length - 1] as
                        | (PerformanceEntry & { renderTime?: number; loadTime?: number })
                        | undefined;
                if (last) {
                        metrics.lcp = Math.round(last.renderTime || last.loadTime || last.startTime);
                        console.debug(`[Perf] LCP: ${metrics.lcp}ms`);
                }
        });

        // Cumulative Layout Shift
        let clsTotal = 0;
        observeWebVital("layout-shift", (entries) => {
                for (const entry of entries as (PerformanceEntry & {
                        hadRecentInput: boolean;
                        value: number;
                })[]) {
                        if (!entry.hadRecentInput) {
                                clsTotal += entry.value;
                                metrics.cls = parseFloat(clsTotal.toFixed(4));
                        }
                }
                console.debug(`[Perf] CLS: ${metrics.cls}`);
        });

        // First Input Delay
        observeWebVital("first-input", (entries) => {
                const entry = entries[0] as (PerformanceEntry & { processingStart: number }) | undefined;
                if (entry) {
                        metrics.fid = Math.round(entry.processingStart - entry.startTime);
                        console.debug(`[Perf] FID: ${metrics.fid}ms`);
                }
        });
}

/** Disconnect all registered observers. Safe to call multiple times. */
export function cleanupPerformanceMonitoring(): void {
        for (const observer of observers) {
                try {
                        observer.disconnect();
                } catch {
                        /* already disconnected */
                }
        }
        observers.length = 0;
}

export { playSound } from "./sound";
