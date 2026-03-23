import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TournamentComplete } from "./TournamentComplete";

describe("TournamentComplete", () => {
	it("keeps the summary actions while removing decorative blob layers", () => {
		const { container } = render(
			<MemoryRouter>
				<TournamentComplete totalMatches={21} participantCount={8} onNewTournament={vi.fn()} />
			</MemoryRouter>,
		);

		expect(screen.getByTestId("tournament-complete-shell")).toBeInTheDocument();
		expect(screen.getByText("Tournament Complete!")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Start New Tournament" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "View Analysis" })).toBeInTheDocument();
		expect(container.querySelector(".animate-blob")).not.toBeInTheDocument();
	});
});
