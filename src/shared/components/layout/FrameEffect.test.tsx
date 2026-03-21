import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrameEffect } from "./FrameEffect";

describe("FrameEffect", () => {
	it("renders children and keeps the frame overlay non-interactive", () => {
		render(
			<FrameEffect>
				<button type="button">Start Tournament</button>
			</FrameEffect>,
		);

		expect(screen.getByRole("button", { name: "Start Tournament" })).toBeInTheDocument();
		expect(screen.getByTestId("app-frame")).toHaveStyle({
			pointerEvents: "none",
		});
		expect(screen.getByTestId("app-frame")).toHaveAttribute("aria-hidden", "true");
	});
});
