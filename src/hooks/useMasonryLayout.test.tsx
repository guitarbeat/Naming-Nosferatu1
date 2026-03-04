import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMasonryLayout } from "./useMasonryLayout";

// Mock ResizeObserver
class MockResizeObserver {
	callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	observe(element: Element) {
		// Store the callback so we can trigger it in tests
		(element as any)._triggerResize = () => {
			this.callback([{ target: element } as unknown as ResizeObserverEntry], this);
		};
	}

	unobserve() {
		/* noop */
	}
	disconnect() {
		/* noop */
	}
}

describe("useMasonryLayout", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("ResizeObserver", MockResizeObserver);

		let rafId = 0;
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			rafId++;
			setTimeout(() => cb(performance.now()), 16);
			return rafId;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			clearTimeout(id);
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("returns empty positions when there are no items", () => {
		let currentPositions: any;
		function TestComponent() {
			const { positions } = useMasonryLayout(0);
			currentPositions = positions;
			return null;
		}
		render(<TestComponent />);

		expect(currentPositions).toEqual([]);
	});

	it("calculates positions correctly based on minColumnWidth and shortest columns", () => {
		let layoutResult: any;

		function TestComponent() {
			const layout = useMasonryLayout<HTMLDivElement>(3, { gap: 10, minColumnWidth: 100 });
			layoutResult = layout;

			return (
				<div
					ref={layout.containerRef}
					data-testid="container"
					style={{ width: "320px" }} // We'll mock offsetWidth
				>
					<div ref={layout.setItemRef(0)} style={{ height: "50px" }} />
					<div ref={layout.setItemRef(1)} style={{ height: "100px" }} />
					<div ref={layout.setItemRef(2)} style={{ height: "30px" }} />
				</div>
			);
		}

		const { getByTestId } = render(<TestComponent />);
		const container = getByTestId("container");

		// Mock dimensions
		Object.defineProperty(container, "offsetWidth", { value: 320, configurable: true });
		const children = Array.from(container.children);
		Object.defineProperty(children[0], "offsetHeight", { value: 50 });
		Object.defineProperty(children[1], "offsetHeight", { value: 100 });
		Object.defineProperty(children[2], "offsetHeight", { value: 30 });

		act(() => {
			// Trigger initial recalculation timeout
			vi.advanceTimersByTime(10);
		});

		expect(layoutResult.columnCount).toBe(3);
		expect(layoutResult.columnWidth).toBe(100);

		expect(layoutResult.positions).toEqual([
			{ column: 0, left: 0, top: 0 },
			{ column: 1, left: 110, top: 0 },
			{ column: 2, left: 220, top: 0 },
		]);

		expect(layoutResult.columnHeights).toEqual([60, 110, 40]);
		expect(layoutResult.totalHeight).toBe(110);
	});

	it("places next item in the shortest column", () => {
		let layoutResult: any;

		function TestComponent() {
			const layout = useMasonryLayout<HTMLDivElement>(4, { gap: 10, minColumnWidth: 100 });
			layoutResult = layout;

			return (
				<div ref={layout.containerRef} data-testid="container">
					<div ref={layout.setItemRef(0)} />
					<div ref={layout.setItemRef(1)} />
					<div ref={layout.setItemRef(2)} />
					<div ref={layout.setItemRef(3)} />
				</div>
			);
		}

		const { getByTestId } = render(<TestComponent />);
		const container = getByTestId("container");

		// Mock dimensions
		Object.defineProperty(container, "offsetWidth", { value: 210, configurable: true });
		const heights = [50, 100, 30, 40];
		Array.from(container.children).forEach((child, i) => {
			Object.defineProperty(child, "offsetHeight", { value: heights[i] });
		});

		act(() => {
			vi.advanceTimersByTime(10);
		});

		expect(layoutResult.columnCount).toBe(2);
		expect(layoutResult.columnWidth).toBe(100);

		expect(layoutResult.positions[0]).toEqual({ column: 0, left: 0, top: 0 });
		expect(layoutResult.positions[1]).toEqual({ column: 1, left: 110, top: 0 });
		expect(layoutResult.positions[2]).toEqual({ column: 0, left: 0, top: 60 });
		expect(layoutResult.positions[3]).toEqual({ column: 0, left: 0, top: 100 });
	});

	it("recalculates when container resizes", () => {
		let layoutResult: any;

		function TestComponent() {
			const layout = useMasonryLayout<HTMLDivElement>(2, { gap: 10, minColumnWidth: 100 });
			layoutResult = layout;

			return (
				<div ref={layout.containerRef} data-testid="container">
					<div ref={layout.setItemRef(0)} />
					<div ref={layout.setItemRef(1)} />
				</div>
			);
		}

		const { getByTestId } = render(<TestComponent />);
		const container = getByTestId("container");

		Object.defineProperty(container, "offsetWidth", { value: 210, configurable: true });
		Array.from(container.children).forEach((child) => {
			Object.defineProperty(child, "offsetHeight", { value: 50 });
		});

		act(() => {
			vi.advanceTimersByTime(10);
		});

		// Initially 2 columns
		expect(layoutResult.columnCount).toBe(2);

		// Simulate resize
		Object.defineProperty(container, "offsetWidth", { value: 100, configurable: true });

		act(() => {
			if (typeof (container as any)._triggerResize === "function") {
				(container as any)._triggerResize();
			}
			vi.advanceTimersByTime(200); // Allow rAF mock to complete
		});

		// Should now be 1 column
		expect(layoutResult.columnCount).toBe(1);
		expect(layoutResult.positions[0].column).toBe(0);
		expect(layoutResult.positions[1].column).toBe(0);
		expect(layoutResult.positions[1].top).toBe(60);
	});

	it("batches setItemRef recalculations to prevent thrashing", () => {
		let layoutResult: any;
		let renderCount = 0;

		function TestComponent() {
			renderCount++;
			const layout = useMasonryLayout<HTMLDivElement>(3, { gap: 10, minColumnWidth: 100 });
			layoutResult = layout;

			return (
				<div ref={layout.containerRef} data-testid="container">
					<div ref={layout.setItemRef(0)} />
					<div ref={layout.setItemRef(1)} />
					<div ref={layout.setItemRef(2)} />
				</div>
			);
		}

		const { getByTestId } = render(<TestComponent />);
		const container = getByTestId("container");

		Object.defineProperty(container, "offsetWidth", { value: 320, configurable: true });
		Array.from(container.children).forEach((child) => {
			Object.defineProperty(child, "offsetHeight", { value: 50 });
		});

		const initialRenderCount = renderCount;

		act(() => {
			vi.advanceTimersByTime(15); // Advance past the 10ms batch timeout
		});

		expect(layoutResult.positions.length).toBe(3);
		// It should only trigger one state update/render for the batched calculation
		// Note: React 18 batches state updates in act() anyway, but this verifies the timeout logic runs
		expect(renderCount).toBeLessThan(initialRenderCount + 3);
	});
});
