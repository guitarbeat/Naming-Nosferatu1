/**
 * @module useMasonryLayout
 * @description Hook for calculating masonry layout positions.
 * Places cards in columns based on size, with the next card going below the shortest column.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface MasonryOptions {
	columnCount?: number;
	gap?: number;
	minColumnWidth?: number;
}

interface MasonryPosition {
	column: number;
	top: number;
	left: number;
}

/**
 * Design token defaults (in px):
 * - gap: 16px (--space-4)
 * - minColumnWidth: 280px (standard card width)
 */
const DEFAULT_GAP_PX = 16;
const DEFAULT_MIN_COLUMN_WIDTH_PX = 280;

export function useMasonryLayout<T extends HTMLElement>(
	itemCount: number,
	options: MasonryOptions = {},
) {
	const containerRef = useRef<T>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [positions, setPositions] = useState<MasonryPosition[]>([]);
	const [columnHeights, setColumnHeights] = useState<number[]>([]);

	const {
		columnCount,
		gap = DEFAULT_GAP_PX,
		minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH_PX,
	} = options;

	const [columnWidth, setColumnWidth] = useState(minColumnWidth);

	const calculateLayout = useCallback(() => {
		if (!containerRef.current || itemCount === 0) {
			setPositions([]);
			setColumnHeights([]);
			return;
		}

		const container = containerRef.current;
		const containerWidth = container.offsetWidth;

		if (containerWidth === 0) {
			return;
		}

		// Calculate number of columns based on container width and min column width
		const calculatedColumnCount =
			columnCount || Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));

		// Calculate actual column width to fill the container perfectly
		const totalGapSpace = (calculatedColumnCount - 1) * gap;
		const actualColumnWidth = (containerWidth - totalGapSpace) / calculatedColumnCount;
		setColumnWidth(actualColumnWidth);

		// Initialize column heights
		const heights = Array(Number(calculatedColumnCount)).fill(0);
		const newPositions: MasonryPosition[] = [];

		// Calculate position for each item
		itemRefs.current.forEach((itemRef, index) => {
			if (!itemRef || index >= itemCount) {
				return;
			}

			// Find the shortest column
			const shortestColumnIndex = heights.indexOf(Math.min(...heights));

			// Calculate position
			const left = shortestColumnIndex * (actualColumnWidth + gap);
			const top = heights[shortestColumnIndex];

			newPositions[index] = {
				column: shortestColumnIndex,
				left,
				top,
			};

			// Update column height
			heights[shortestColumnIndex] += itemRef.offsetHeight + gap;
		});

		setPositions(newPositions);
		setColumnHeights(heights);
	}, [itemCount, columnCount, gap, minColumnWidth]);

	// Recalculate on mount, resize, or when items change
	useEffect(() => {
		// Initial calculation after a brief delay to ensure DOM is ready
		const timeoutId = setTimeout(() => {
			calculateLayout();
		}, 0);

		let resizeRafId: number | null = null;
		const resizeObserver = new ResizeObserver(() => {
			// Throttle resize calculations with rAF instead of setTimeout
			if (resizeRafId) {
				return;
			}
			resizeRafId = requestAnimationFrame(() => {
				resizeRafId = null;
				calculateLayout();
			});
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Only observe container, not individual items (reduces observer overhead)

		return () => {
			clearTimeout(timeoutId);
			if (resizeRafId) {
				cancelAnimationFrame(resizeRafId);
			}
			resizeObserver.disconnect();
		};
	}, [calculateLayout]);

	// Batch layout updates to prevent thrashing
	const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	// Cache for stable ref callbacks to prevent unnecessary re-renders
	const refCallbacks = useRef<Map<number, (el: HTMLDivElement | null) => void>>(new Map());

	// Store calculateLayout in a ref to break dependency cycles in setItemRef
	const calculateLayoutRef = useRef(calculateLayout);
	useEffect(() => {
		calculateLayoutRef.current = calculateLayout;
	}, [calculateLayout]);

	// Set item ref callback - returns a stable function reference for each index
	const setItemRef = useCallback((index: number) => {
		if (!refCallbacks.current.has(index)) {
			refCallbacks.current.set(index, (el: HTMLDivElement | null) => {
				if (itemRefs.current[index] !== el) {
					itemRefs.current[index] = el;

					// Batch recalculations
					if (layoutTimeoutRef.current) {
						clearTimeout(layoutTimeoutRef.current);
					}

					// Small delay (10ms) allows capturing multiple ref updates in a single layout pass
					layoutTimeoutRef.current = setTimeout(() => {
						calculateLayoutRef.current();
						layoutTimeoutRef.current = null;
					}, 10);
				}
			});
		}
		// biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist by check above
		return refCallbacks.current.get(index)!;
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (layoutTimeoutRef.current) {
				clearTimeout(layoutTimeoutRef.current);
			}
		};
	}, []);

	return {
		containerRef,
		setItemRef,
		positions,
		columnHeights,
		columnWidth,
		columnCount: columnHeights.length,
		totalHeight: Math.max(0, ...columnHeights),
		recalculate: calculateLayout,
	};
}
