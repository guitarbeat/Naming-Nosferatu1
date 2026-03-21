import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Tournament from "./Tournament";

const audioManagerMock = {
	playLevelUpSound: vi.fn(),
	playWowSound: vi.fn(),
	playSurpriseSound: vi.fn(),
	playStreakSound: vi.fn(),
	primeAudioExperience: vi.fn(),
	handleToggleMute: vi.fn(),
	isMuted: false,
	handlePreviousTrack: vi.fn(),
	toggleBackgroundMusic: vi.fn(),
	backgroundMusicEnabled: false,
	handleNextTrack: vi.fn(),
};

const mockStore = {
	user: { name: "Test User" },
	tournamentActions: { resetTournament: vi.fn() },
	ui: { showCatPictures: false },
	uiActions: { setCatPictures: vi.fn() },
};

const useTournamentStateMock = vi.fn();
let tournamentState: Record<string, unknown>;

function createTournamentState(overrides: Record<string, unknown> = {}) {
	return {
		currentMatch: {
			mode: "1v1",
			left: {
				id: "1",
				name: "Luna",
				description: "Moonlit menace",
				pronunciation: "loo-nah",
			},
			right: {
				id: "2",
				name: "Miso",
				description: "Tiny tyrant",
				pronunciation: "mee-so",
			},
		},
		ratings: {},
		isComplete: false,
		tournamentMode: "1v1",
		round: 1,
		totalRounds: 3,
		bracketStage: "Quarterfinal",
		matchNumber: 1,
		totalMatches: 7,
		handleUndo: vi.fn(),
		canUndo: true,
		handleQuit: vi.fn(),
		progress: 14,
		handleVoteWithAnimation: vi.fn(),
		isVoting: false,
		matchHistory: [],
		...overrides,
	};
}

vi.mock("framer-motion", () => ({
	AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	motion: {
		div: ({ children, ...props }: Record<string, unknown>) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: () => false,
}));

vi.mock("@/store/appStore", () => ({
	default: (selector?: (state: typeof mockStore) => unknown) =>
		selector ? selector(mockStore) : mockStore,
}));

vi.mock("@/shared/components/layout/Feedback", () => ({
	ErrorComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/layout/LoadingSequence", () => ({
	LoadingSequence: ({
		tone,
		title,
		subtitle,
	}: {
		tone: string;
		title: string;
		subtitle: string;
	}) => (
		<div data-testid="loading-sequence" data-tone={tone}>
			{title}::{subtitle}
		</div>
	),
}));

vi.mock("./hooks", () => ({
	useAudioManager: () => audioManagerMock,
}));

vi.mock("./hooks/useTournamentState", () => ({
	useTournamentState: () => useTournamentStateMock(),
}));

vi.mock("./components/TournamentComplete", () => ({
	TournamentComplete: ({
		totalMatches,
		participantCount,
	}: {
		totalMatches: number;
		participantCount: number;
	}) => (
		<div data-testid="tournament-complete">
			{totalMatches}:{participantCount}
		</div>
	),
}));

describe("Tournament completion reveal", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		audioManagerMock.playLevelUpSound.mockReset();
		audioManagerMock.playWowSound.mockReset();
		audioManagerMock.playSurpriseSound.mockReset();
		audioManagerMock.playStreakSound.mockReset();
		audioManagerMock.primeAudioExperience.mockReset();
		audioManagerMock.handleToggleMute.mockReset();
		audioManagerMock.handlePreviousTrack.mockReset();
		audioManagerMock.toggleBackgroundMusic.mockReset();
		audioManagerMock.handleNextTrack.mockReset();
		mockStore.tournamentActions.resetTournament.mockReset();
		mockStore.uiActions.setCatPictures.mockReset();
		mockStore.ui.showCatPictures = false;

		tournamentState = createTournamentState();
		useTournamentStateMock.mockImplementation(() => tournamentState);
	});

	afterEach(() => {
		act(() => {
			vi.runOnlyPendingTimers();
		});
		vi.useRealTimers();
	});

	it("shows the winner reveal over the completion screen", () => {
		tournamentState = createTournamentState({
			currentMatch: null,
			isComplete: true,
			round: 3,
			bracketStage: "Final",
			matchNumber: 7,
			progress: 100,
			canUndo: false,
		});

		render(
			<MemoryRouter>
				<Tournament names={[]} onComplete={vi.fn()} />
			</MemoryRouter>,
		);

		expect(screen.getByTestId("tournament-complete")).toBeInTheDocument();
		expect(screen.getByTestId("loading-sequence")).toHaveAttribute(
			"data-tone",
			"victory",
		);
	});

	it("keeps utility controls hidden until the utility toggle is opened", () => {
		render(
			<MemoryRouter>
				<Tournament
					names={[
						{ id: "1", name: "Luna" },
						{ id: "2", name: "Miso" },
					]}
					onComplete={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(
			screen.queryByTestId("tournament-utilities"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Bracket Path")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Mute sound" }),
		).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Show tournament utilities" }),
		);

		expect(screen.getByTestId("tournament-utilities")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Mute sound" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Play music" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Show cat pictures" }),
		).toBeInTheDocument();
	});

	it("uses the calmer status banner for vote feedback", () => {
		const handleVoteWithAnimation = vi.fn();
		tournamentState = createTournamentState({
			handleVoteWithAnimation,
		});

		render(
			<MemoryRouter>
				<Tournament
					names={[
						{ id: "1", name: "Luna" },
						{ id: "2", name: "Miso" },
					]}
					onComplete={vi.fn()}
				/>
			</MemoryRouter>,
		);

		act(() => {
			fireEvent.click(
				screen.getByRole("button", { name: "Vote for name Luna" }),
			);
		});

		expect(handleVoteWithAnimation).toHaveBeenCalledWith("1", "2");
		expect(screen.getByText("Luna advances")).toBeInTheDocument();
		expect(screen.queryByText("Streak Ignited")).not.toBeInTheDocument();
		expect(screen.queryByText("Next Stage")).not.toBeInTheDocument();
	});

	it("uses the calmer status banner for round updates", () => {
		const { rerender } = render(
			<MemoryRouter>
				<Tournament
					names={[
						{ id: "1", name: "Luna" },
						{ id: "2", name: "Miso" },
					]}
					onComplete={vi.fn()}
				/>
			</MemoryRouter>,
		);

		act(() => {
			tournamentState = createTournamentState({
				round: 2,
				bracketStage: "Semifinal",
			});

			rerender(
				<MemoryRouter>
					<Tournament
						names={[
							{ id: "1", name: "Luna" },
							{ id: "2", name: "Miso" },
						]}
						onComplete={vi.fn()}
					/>
				</MemoryRouter>,
			);
		});

		expect(screen.getByText("Semifinal matchups ready")).toBeInTheDocument();
		expect(screen.queryByText("Next Stage")).not.toBeInTheDocument();
		expect(screen.queryByText("Streak Ignited")).not.toBeInTheDocument();
	});
});
