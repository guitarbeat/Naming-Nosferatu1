import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingNavbar } from "./FloatingNavbar";

const setSwipeModeMock = vi.fn();
const setNamesMock = vi.fn();

const mockStore = {
	tournament: {
		selectedNames: [] as string[],
		names: null as string[] | null,
		isComplete: false,
	},
	tournamentActions: {
		setNames: setNamesMock,
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
		button: ({ whileTap: _whileTap, ...props }: Record<string, unknown>) => (
			<button {...props} />
		),
		div: ({ whileTap: _whileTap, ...props }: Record<string, unknown>) => (
			<div {...props} />
		),
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

function mountSections(topById: Record<string, number>) {
	for (const [id, top] of Object.entries(topById)) {
		const section = document.createElement("section");
		section.id = id;
		Object.defineProperty(section, "getBoundingClientRect", {
			value: () => ({
				top,
				bottom: top + 120,
				left: 0,
				right: 200,
				width: 200,
				height: 120,
				x: 0,
				y: top,
				toJSON: () => ({}),
			}),
		});
		document.body.append(section);
	}
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
		setNamesMock.mockReset();

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

	it("renders home navigation items and tracks the active section", () => {
		mountSections({ pick: 220, suggest: 24, profile: 520 });

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		const pickButton = screen.getByText("Pick Names").closest("button");
		const suggestButton = screen.getByText("Suggest").closest("button");
		const profileButton = screen.getByText("Profile").closest("button");

		expect(pickButton).toBeInTheDocument();
		expect(suggestButton).toHaveAttribute("aria-current", "location");
		expect(profileButton).toBeInTheDocument();
	});

	it("promotes the first item to a highlighted start action when enough names are selected", () => {
		mountSections({ pick: 0, suggest: 200, profile: 400 });
		mockStore.tournament.selectedNames = ["Luna", "Fig", "Miso"];

		render(
			<MemoryRouter initialEntries={["/"]}>
				<FloatingNavbar />
			</MemoryRouter>,
		);

		const startButton = screen.getByText("Start (3)").closest("button");

		expect(startButton).toBeInTheDocument();
		expect(startButton).toHaveClass("floating-navbar__item--accent");
		expect(
			screen.queryByRole("button", { name: "Pick Names" }),
		).not.toBeInTheDocument();
	}, 20000);

	it("shows analyze as the current destination on the analysis route", () => {
		mockStore.tournament.isComplete = true;
		mockStore.tournament.names = ["Luna", "Fig"];

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
		mountSections({ pick: 0, suggest: 200, profile: 400 });
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
		mountSections({ pick: 0, suggest: 200, profile: 400 });
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
		mountSections({ pick: 0, suggest: 200, profile: 24 });
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

		expect(
			screen.queryByRole("navigation", { name: "Primary" }),
		).not.toBeInTheDocument();
	});
});
