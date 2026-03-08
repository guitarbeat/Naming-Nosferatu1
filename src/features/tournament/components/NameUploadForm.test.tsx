import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { imagesAPI } from "@/services/supabase/client";
import { NameUploadForm } from "./NameUploadForm";

// Mock dependencies
vi.mock("@/services/supabase/client", () => ({
	imagesAPI: {
		upload: vi.fn(),
	},
}));

vi.mock("@/shared/lib/basic", () => ({
	compressImageFile: vi.fn((file) => Promise.resolve(file)),
	devError: vi.fn(),
}));

describe("NameUploadForm", () => {
	it("renders input that is accessible", () => {
		render(<NameUploadForm onImagesUploaded={vi.fn()} isAdmin={true} />);

		const uploadText = screen.getByText(/Upload New Cat Photos/i);
		const label = uploadText.closest("label");
		const input = label?.querySelector("input");

		expect(input).toBeInTheDocument();
		expect(input).toHaveClass("sr-only");
		expect(input).not.toHaveStyle({ display: "none" });
	});

	it("shows loading state during upload", async () => {
		// Mock upload to hang so we can check loading state
		vi.mocked(imagesAPI.upload).mockImplementation(
			() =>
				new Promise(() => {
					/* intentional */
				}),
		);

		render(<NameUploadForm onImagesUploaded={vi.fn()} isAdmin={true} />);

		const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
		// Find input by its associated label text
		const input = screen.getByLabelText(/Upload New Cat Photos/i);

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
		});

		expect(input).toBeDisabled();
	});

	it("shows success message after upload", async () => {
		vi.mocked(imagesAPI.upload).mockResolvedValue({
			path: "some/path.jpg",
			// removed fullPath as it is not part of the return type
		});
		const onImagesUploaded = vi.fn();

		render(<NameUploadForm onImagesUploaded={onImagesUploaded} isAdmin={true} />);

		const file = new File(["cat"], "cat.png", { type: "image/png" });
		const input = screen.getByLabelText(/Upload New Cat Photos/i);

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(screen.getByText(/1 image uploaded!/i)).toBeInTheDocument();
		});

		expect(onImagesUploaded).toHaveBeenCalledWith(["some/path.jpg"]);
	});

	it("shows error message on failure", async () => {
		vi.mocked(imagesAPI.upload).mockRejectedValue(new Error("Failed"));

		render(<NameUploadForm onImagesUploaded={vi.fn()} isAdmin={true} />);

		const file = new File(["cat"], "cat.png", { type: "image/png" });
		const input = screen.getByLabelText(/Upload New Cat Photos/i);

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
		});
	});
});
