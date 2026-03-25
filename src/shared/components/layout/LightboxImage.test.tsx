import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LightboxImage } from "./LightboxImage";

describe("LightboxImage", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("clears a pending retry timer when the image source changes", () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
		const { rerender } = render(
			<LightboxImage src="/cats/one.jpg" alt="Cat one" />,
		);

		fireEvent.error(screen.getByAltText("Cat one"));
		rerender(<LightboxImage src="/cats/two.jpg" alt="Cat two" />);

		expect(clearTimeoutSpy).toHaveBeenCalled();
	});

	it("clears a pending retry timer when the component unmounts", () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
		const { unmount } = render(
			<LightboxImage src="/cats/one.jpg" alt="Cat one" />,
		);

		fireEvent.error(screen.getByAltText("Cat one"));
		unmount();

		expect(clearTimeoutSpy).toHaveBeenCalled();
	});
});
