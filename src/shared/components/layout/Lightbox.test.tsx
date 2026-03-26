import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "./Lightbox";

function LightboxHarness() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open lightbox
			</button>
			{open && (
				<Lightbox
					images={["/cats/one.jpg"]}
					currentIndex={0}
					onClose={() => setOpen(false)}
					onNavigate={() => undefined}
				/>
			)}
		</>
	);
}

describe("Lightbox", () => {
	it("restores focus to the opener after closing", async () => {
		render(<LightboxHarness />);
		const opener = screen.getByRole("button", { name: "Open lightbox" });

		opener.focus();
		fireEvent.click(opener);

		const closeButton = await screen.findByRole("button", {
			name: "Close lightbox and return to gallery",
		});
		await waitFor(() => {
			expect(closeButton).toHaveFocus();
		});

		fireEvent.click(closeButton);

		await waitFor(() => {
			expect(opener).toHaveFocus();
		});
	});
});
