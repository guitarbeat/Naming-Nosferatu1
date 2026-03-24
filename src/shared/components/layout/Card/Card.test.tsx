import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardName, CardStats } from "./Card";

describe("Card subcomponents", () => {
	it("renders CardStats content", () => {
		render(<CardStats title="Stats Card" value="summary" />);
		expect(screen.getByText("Stats Card")).toBeTruthy();
		expect(screen.getByText("summary")).toBeTruthy();
	});

	it("renders CardName content", () => {
		render(<CardName name="Nosferatu" />);
		expect(screen.getByText("Nosferatu")).toBeTruthy();
	});
});
