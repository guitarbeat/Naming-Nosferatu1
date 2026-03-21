import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingSequence } from "./LoadingSequence";

function createMatchMedia(matches = false) {
	return vi.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

describe("LoadingSequence", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: createMatchMedia(false),
		});
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		document.body.style.overflow = "";
		delete document.documentElement.dataset.loadingSequence;
	});

	it("opens the masks, unlocks body scroll, and calls onComplete", () => {
		const onComplete = vi.fn();

		render(
			<LoadingSequence
				title="Naming Nosferatu"
				subtitle="Preparing the tournament floor."
				onComplete={onComplete}
			/>,
		);

		expect(screen.getByTestId("loading-sequence")).toBeInTheDocument();
		expect(document.documentElement.dataset.loadingSequence).toBe("sealed");
		expect(document.body.style.overflow).toBe("hidden");

		act(() => {
			vi.advanceTimersByTime(480);
		});

		expect(screen.getByTestId("loading-sequence")).toHaveClass(
			"loading-sequence--opening",
		);
		expect(document.documentElement.dataset.loadingSequence).toBe("opening");

		act(() => {
			vi.advanceTimersByTime(1220);
		});

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("loading-sequence")).not.toBeInTheDocument();
		expect(document.documentElement.dataset.loadingSequence).toBeUndefined();
		expect(document.body.style.overflow).toBe("");
	});

	it("uses shorter timing when reduced motion is enabled", () => {
		const onComplete = vi.fn();

		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: createMatchMedia(true),
		});

		render(
			<LoadingSequence
				title="A Victor Emerges"
				subtitle="Sealing the bracket."
				onComplete={onComplete}
			/>,
		);

		act(() => {
			vi.advanceTimersByTime(120);
		});

		expect(screen.getByTestId("loading-sequence")).toHaveClass(
			"loading-sequence--opening",
		);

		act(() => {
			vi.advanceTimersByTime(240);
		});

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("loading-sequence")).not.toBeInTheDocument();
	});
});
