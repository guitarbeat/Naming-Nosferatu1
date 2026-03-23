import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchSideCard } from "./MatchSideCard";

vi.mock("@/shared/components/layout/CatImage", () => ({
	default: ({ alt }: { alt: string }) => <div data-testid="cat-image">{alt}</div>,
}));

describe("MatchSideCard", () => {
	it("renders a compact streak chip without flame effects", () => {
		render(
			<MatchSideCard
				side="left"
				name="Luna"
				img={null}
				heatLevel="hot"
				streak={5}
				isVoting={false}
				isSelected={true}
				hasSelectionFeedback={false}
				isTeam={false}
				members={["Luna"]}
				description="Moonlit menace"
				pronunciation="loo-nah"
				onKeyDown={vi.fn()}
				onVote={vi.fn()}
			/>,
		);

		const card = screen.getByRole("button", { name: "Vote for name Luna" });

		expect(card).toHaveClass("ring-2");
		expect(card).not.toHaveClass("animate-float");
		expect(screen.getByTestId("streak-chip-left")).toHaveTextContent("Hot streak x5");
		expect(screen.queryByText("🔥")).not.toBeInTheDocument();
		expect(screen.getByText("[loo-nah]")).toBeInTheDocument();
		expect(screen.getByText("Moonlit menace")).toBeInTheDocument();
	});

	it("keeps a softer dimmed state for the non-selected side", () => {
		render(
			<MatchSideCard
				side="right"
				name="Miso"
				img={null}
				heatLevel={null}
				streak={0}
				isVoting={false}
				isSelected={false}
				hasSelectionFeedback={true}
				isTeam={false}
				members={["Miso"]}
				onKeyDown={vi.fn()}
				onVote={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Vote for name Miso" })).toHaveClass(
			"opacity-[0.55]",
		);
		expect(screen.queryByTestId("streak-chip-right")).not.toBeInTheDocument();
	});
});
