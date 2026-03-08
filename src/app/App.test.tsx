import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

// Mock dependencies
vi.mock("@/app/providers/Providers", () => ({
	useAuth: () => ({
		user: { id: "1", isAdmin: false },
		isLoading: false,
	}),
}));

vi.mock("@/store/appStore", () => ({
	default: () => ({
		user: { name: "Test User", isAdmin: false },
		userActions: { setAdminStatus: vi.fn() },
		tournament: { names: [], ratings: [] },
		tournamentActions: {},
	}),
	useAppStoreInitialization: vi.fn(),
}));

vi.mock("@/features/tournament/hooks", () => ({
	useTournamentHandlers: () => ({
		handleTournamentComplete: vi.fn(),
		handleStartNewTournament: vi.fn(),
	}),
}));

vi.mock("@/shared/components", () => ({
	AppLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="app-layout">{children}</div>
	),
	Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	Loading: ({ text }: { text: string }) => <div>Loading: {text}</div>,
	Section: ({ children, id }: { children: React.ReactNode; id: string }) => (
		<section id={id}>{children}</section>
	),
}));

vi.mock("@/features/tournament/Tournament", () => ({
	default: () => <div>Tournament Component</div>,
}));

vi.mock("@/shared/hooks", () => ({
	useOfflineSync: vi.fn(),
}));

vi.mock("@/shared/lib/performance", () => ({
	initializePerformanceMonitoring: vi.fn(),
	cleanupPerformanceMonitoring: vi.fn(),
}));

vi.mock("@/services/errorManager", () => ({
	ErrorManager: {
		setupGlobalErrorHandling: () => vi.fn(),
	},
}));

// Mock lazy components using the alias
vi.mock("@/app/appConfig", () => ({
	errorContexts: {
		tournamentFlow: "tournamentFlow",
		analysisDashboard: "analysisDashboard",
	},
	routeComponents: {
		TournamentFlow: () => <div data-testid="tournament-flow">Tournament Flow</div>,
		DashboardLazy: () => <div data-testid="dashboard">Dashboard</div>,
		AdminDashboardLazy: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
	},
}));

describe("App Component", () => {
	it("renders the tournament flow on home route", async () => {
		render(
			<MemoryRouter initialEntries={["/"]}>
				<App />
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("app-layout")).toBeInTheDocument();
			expect(screen.getByTestId("tournament-flow")).toBeInTheDocument();
		});
	});

	it("renders the tournament page", async () => {
		render(
			<MemoryRouter initialEntries={["/tournament"]}>
				<App />
			</MemoryRouter>,
		);

		await waitFor(() => {
			// Since names are empty in mock, it should show "No names selected"
			expect(screen.getByText("No names selected for tournament")).toBeInTheDocument();
		});
	});
});
