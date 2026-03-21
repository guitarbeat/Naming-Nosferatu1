import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button, { normalizeButtonSize } from "./Button";

describe("Button", () => {
	it("normalizes legacy sizes and exposes shared presentation attributes", () => {
		render(
			<Button variant="secondary" size="small" presentation="chip" shape="pill">
				Filters
			</Button>,
		);

		const button = screen.getByRole("button", { name: "Filters" });
		expect(normalizeButtonSize("small")).toBe("sm");
		expect(button).toHaveAttribute("data-button-variant", "secondary");
		expect(button).toHaveAttribute("data-button-presentation", "chip");
		expect(button).toHaveAttribute("data-button-shape", "pill");
		expect(button.className).toContain("focus-visible:ring-2");
		expect(button.className).toContain("min-h-8");
	});

	it("renders icon-only buttons with the shared pill treatment", () => {
		render(
			<Button type="button" iconOnly={true} aria-label="Favorite">
				<span aria-hidden={true}>★</span>
			</Button>,
		);

		const button = screen.getByRole("button", { name: "Favorite" });
		expect(button).toHaveAttribute("data-button-shape", "pill");
		expect(button.className).toContain("size-10");
	});

	it("renders the glass variant through the fancy button shell", () => {
		render(<Button variant="glass">Open</Button>);

		const button = screen.getByRole("button", { name: "Open" });
		expect(button).toHaveClass("fancy-button");
		expect(button.parentElement).toHaveAttribute("data-button-variant", "glass");
	});

	it("disables interaction while loading", () => {
		const onClick = vi.fn();

		render(
			<Button loading={true} onClick={onClick}>
				Saving
			</Button>,
		);

		const button = screen.getByRole("button", { name: "Saving" });
		fireEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
	});
});
