import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppVisualEffects } from "./AppVisualEffects";

const { supportsWebGLMock, useBrowserStateMock } = vi.hoisted(() => ({
	supportsWebGLMock: vi.fn(),
	useBrowserStateMock: vi.fn(),
}));

vi.mock("@/shared/hooks", () => ({
	useBrowserState: () => useBrowserStateMock(),
}));

vi.mock("./MagicMoire", () => ({
	MagicMoire: ({ theme }: { theme?: string }) => (
		<div data-testid="magic-moire" data-theme={theme}>
			interactive moire
		</div>
	),
	supportsWebGL: () => supportsWebGLMock(),
}));

describe("AppVisualEffects", () => {
	it("renders the interactive moire layer when motion and connection allow it", async () => {
		useBrowserStateMock.mockReturnValue({
			prefersReducedMotion: false,
			isSlowConnection: false,
		});
		supportsWebGLMock.mockReturnValue(true);

		const { container } = render(<AppVisualEffects theme="dark" />);

		await waitFor(() => {
			expect(screen.getByTestId("magic-moire")).toBeInTheDocument();
		});

		expect(
			container.querySelector(".cat-background__moire"),
		).not.toBeInTheDocument();
	});

	it.each([
		[
			"reduced motion",
			{ prefersReducedMotion: true, isSlowConnection: false },
			true,
		],
		[
			"slow connection",
			{ prefersReducedMotion: false, isSlowConnection: true },
			true,
		],
		[
			"missing WebGL",
			{ prefersReducedMotion: false, isSlowConnection: false },
			false,
		],
	])("falls back to CSS moire for %s", async (_label, browserState, webglSupport) => {
		useBrowserStateMock.mockReturnValue(browserState);
		supportsWebGLMock.mockReturnValue(webglSupport);

		const { container } = render(<AppVisualEffects theme="dark" />);

		await waitFor(() => {
			expect(
				container.querySelector(".cat-background__moire"),
			).toBeInTheDocument();
		});

		expect(screen.queryByTestId("magic-moire")).not.toBeInTheDocument();
	});
});
