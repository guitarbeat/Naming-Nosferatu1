import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNameSuggestion } from "@/shared/hooks";
import { coreAPI } from "@/shared/services/supabase/client";

// Mock the dependencies
vi.mock("@/shared/services/supabase/client", () => ({
	coreAPI: {
		addName: vi.fn(),
	},
}));

describe("useNameSuggestion", () => {
	const mockedCoreAPI = vi.mocked(coreAPI);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("initializes with default values", () => {
		const { result } = renderHook(() => useNameSuggestion());
		expect(result.current.values).toEqual({ name: "", description: "" });
		expect(result.current.errors).toEqual({});
		expect(result.current.touched).toEqual({});
		expect(result.current.isSubmitting).toBe(false);
		expect(result.current.globalError).toBe("");
		expect(result.current.successMessage).toBe("");
	});

	it("validates input", () => {
		const { result } = renderHook(() => useNameSuggestion());

		act(() => {
			result.current.handleChange("name", "");
			result.current.handleBlur("name");
		});

		// Trigger validation by trying to submit
		act(() => {
			result.current.handleSubmit();
		});

		expect(result.current.errors.name).toBe("Name is required");
		expect(result.current.errors.description).toBe("Description is required");
	});

	it("submits valid data successfully", async () => {
		const onSuccessMock = vi.fn();
		const { result } = renderHook(() => useNameSuggestion({ onSuccess: onSuccessMock }));

		// Setup mock success response
		mockedCoreAPI.addName.mockResolvedValue({
			success: true,
			status: "committed",
			data: { id: "123", name: "Test Cat" },
		});

		act(() => {
			result.current.handleChange("name", "Test Cat");
			result.current.handleChange("description", "A cute test cat");
		});

		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(coreAPI.addName).toHaveBeenCalledWith("Test Cat", "A cute test cat");
		expect(result.current.successMessage).toBe("Name suggestion submitted successfully!");
		expect(result.current.values).toEqual({ name: "", description: "" });
		expect(onSuccessMock).toHaveBeenCalled();
	});

	it("handles submission error", async () => {
		const { result } = renderHook(() => useNameSuggestion());

		// Setup mock error response
		mockedCoreAPI.addName.mockResolvedValue({
			success: false,
			status: "failed",
			error: "Duplicate name",
		});

		act(() => {
			result.current.handleChange("name", "Duplicate Cat");
			result.current.handleChange("description", "Another cat");
		});

		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(coreAPI.addName).toHaveBeenCalled();
		// In my implementation plan, if success is false, I throw, so globalError should be set
		expect(result.current.globalError).toBe("Duplicate name");
		expect(result.current.successMessage).toBe("");
	});

	it("handles exception during submission", async () => {
		const { result } = renderHook(() => useNameSuggestion());

		// Setup mock exception
		mockedCoreAPI.addName.mockRejectedValue(new Error("Network error"));

		act(() => {
			result.current.handleChange("name", "Error Cat");
			result.current.handleChange("description", "Cat causing error");
		});

		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(coreAPI.addName).toHaveBeenCalled();
		expect(result.current.globalError).toBe("Network error");
	});
});
