import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

vi.mock("@/store/appStore", () => ({
	default: () => ({
		user: { isLoggedIn: false },
		tournament: { isLoading: false },
		errors: { current: null },
		errorActions: { clearError: vi.fn() },
		ui: { theme: "dark" },
	}),
}));

vi.mock("@/shared/hooks", () => ({
	useBrowserState: () => ({
		prefersReducedMotion: true,
		isSlowConnection: false,
		isOnline: true,
		isMobile: false,
		isTablet: false,
		isDesktop: true,
	}),
}));

vi.mock("./Button", () => ({
	ScrollToTopButton: () => <div data-testid="scroll-to-top-button" />,
}));

vi.mock("./Feedback", () => ({
	ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
	ErrorComponent: () => <div data-testid="error-component" />,
	Loading: ({ text }: { text?: string }) => <div data-testid="loading">{text}</div>,
	OfflineIndicator: () => <div data-testid="offline-indicator" />,
}));

vi.mock("./FloatingNavbar", () => ({
	FloatingNavbar: () => <div data-testid="floating-navbar" />,
}));

describe("AppLayout", () => {
	it("mounts the app visual shell and frame around page content", () => {
		render(
			<MemoryRouter initialEntries={["/"]}>
				<AppLayout>
					<div>Bracket Content</div>
				</AppLayout>
			</MemoryRouter>,
		);

		expect(screen.getByTestId("app-visual-effects")).toBeInTheDocument();
		expect(screen.getByTestId("app-frame")).toBeInTheDocument();
		expect(screen.getByText("Bracket Content")).toBeInTheDocument();
		expect(screen.getByRole("main")).toHaveClass("app-main-shell--nav-safe");
	}, 10000);

	it("drops the nav-safe shell padding on immersive routes", () => {
		render(
			<MemoryRouter initialEntries={["/tournament"]}>
				<AppLayout>
					<div>Bracket Content</div>
				</AppLayout>
			</MemoryRouter>,
		);

		expect(screen.getByRole("main")).not.toHaveClass("app-main-shell--nav-safe");
	});
});
