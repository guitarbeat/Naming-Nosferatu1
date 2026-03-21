import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingNavbar } from "./FloatingNavbar";

const setSwipeModeMock = vi.fn();

const mockStore = {
	tournament: {
		selectedNames: [] as string[],
		names: null as string[] | null,
		isComplete: false,
	},
	user: {
		isLoggedIn: false,
		name: "",
		avatarUrl: "",
		isAdmin: false,
	},
	ui: {
		isSwipeMode: false,
	},
	uiActions: {
		setSwipeMode: setSwipeModeMock,
	},
};

vi.mock("framer-motion", () => ({
	motion: {
		button: ({ whileTap: _whileTap, ...props }: Record<string, unknown>) => <button {...props} />,
		div: ({ whileTap: _whileTap, ...props }: Record<string, unknown>) => <div {...props} />,
	},
}));

vi.mock("./LiquidGlass", () => ({
	default: ({
		children,
		className,
		style,
	}: {
		children: ReactNode;
		className?: string;
		style?: CSSProperties;
	}) => (
		<div data-testid="liquid-glass" className={className} style={style}>
			{children}
		</div>
	),
}));

vi.mock("@/store/appStore", () => ({
	default: () => mockStore,
}));

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

describe("FloatingNavbar", () => {
	beforeEach(() => {
		mockStore.tournament.selectedNames = [];
		mockStore.tournament.names = null;
		mockStore.tournament.isComplete = false;
		mockStore.user.isLoggedIn = false;
		mockStore.user.name = "";
		mockStore.user.avatarUrl = "";
		mockStore.user.isAdmin = false;
		mockStore.ui.isSwipeMode = false;

		setSwipeModeMock.mockReset();

		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: createMatchMedia(false),
		});
		Object.defineProperty(window, "scrollTo", {
			writable: true,
			value: vi.fn(),
		});

		vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
			callback(0);
			return 1;
		});
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("renders home navigation items and marks the current hash tab", () => {
		render(
			<MemoryRouter initialEntries={["/#suggest"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Pick" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Suggest" })).toHaveAttribute(
			"aria-current",
			"location",
		);
		expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
	});

	it("keeps the picker entry visible and highlighted when a bracket is ready", () => {
		mockStore.tournament.selectedNames = ["Luna", "Fig", "Miso"];

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		const pickButton = screen.getByRole("button", { name: "Pick (3)" });

		expect(pickButton).toBeInTheDocument();
		expect(pickButton).toHaveClass("floating-navbar__item--accent");
	});

	it("shows analyze as the current destination on the analysis route", () => {
		render(
			<MemoryRouter initialEntries={["/analysis"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Analyze" })).toHaveAttribute(
			"aria-current",
			"location",
		);
	});

	it("uses pressed semantics for the layout mode chip without treating it as the current destination", () => {
		mockStore.ui.isSwipeMode = true;

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		const modeChip = screen.getByRole("button", { name: "Swipe mode active" });

		expect(modeChip).toHaveAttribute("aria-pressed", "true");
		expect(modeChip).not.toHaveAttribute("aria-current");

		fireEvent.click(modeChip);
		expect(setSwipeModeMock).toHaveBeenCalledWith(false);
	});

	it("renders the logged-in avatar when available", () => {
		mockStore.user.isLoggedIn = true;
		mockStore.user.name = "Avery Admin";
		mockStore.user.avatarUrl = "https://example.com/avatar.png";

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		expect(screen.getByAltText("Avery")).toBeInTheDocument();
	});

	it("keeps the admin profile icon treatment when no avatar is present", () => {
		mockStore.user.isLoggedIn = true;
		mockStore.user.name = "Avery Admin";
		mockStore.user.isAdmin = true;

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		const profileButton = screen.getByRole("button", { name: "Avery" });
		const profileIcon = profileButton.querySelector("svg");

		expect(profileIcon).not.toBeNull();
		expect(profileIcon).toHaveClass("text-chart-4");
	});

	it("does not render on the tournament route", () => {
		render(
			<MemoryRouter initialEntries={["/tournament"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
	});
});
