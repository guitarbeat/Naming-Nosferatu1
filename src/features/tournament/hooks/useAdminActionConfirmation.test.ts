import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NameItem } from "@/shared/types";
import {
	type PendingAdminAction,
	type UseAdminActionConfirmationOptions,
	useAdminActionConfirmation,
} from "./useAdminActionConfirmation";

const mockNames: NameItem[] = [
	{ id: "1", name: "Alice" },
	{ id: "2", name: "Bob" },
];

const mockAction: PendingAdminAction = {
	type: "toggle-hidden",
	nameId: "1",
	isCurrentlyEnabled: false,
};

describe("useAdminActionConfirmation", () => {
	const createDefaultOptions = (): UseAdminActionConfirmationOptions => ({
		isAdmin: true,
		userName: "admin_user",
		names: mockNames,
		toast: {
			showWarning: vi.fn(),
			showError: vi.fn(),
		},
		isBusy: vi.fn().mockReturnValue(false),
		executeAction: vi.fn().mockResolvedValue(undefined),
	});

	describe("requestAdminAction", () => {
		it("should block action and show warning if not admin", () => {
			const options = createDefaultOptions();
			options.isAdmin = false;
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(options.toast.showWarning).toHaveBeenCalledWith("Only admins can perform that action.");
			expect(result.current.pendingAdminAction).toBeNull();
		});

		it("should block action and show error if userName is missing", () => {
			const options = createDefaultOptions();
			options.userName = "";
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(options.toast.showError).toHaveBeenCalledWith(
				"Admin actions require a valid user session. Please log in again.",
			);
			expect(result.current.pendingAdminAction).toBeNull();
		});

		it("should set pending action if admin and userName is present", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(options.toast.showWarning).not.toHaveBeenCalled();
			expect(options.toast.showError).not.toHaveBeenCalled();
			expect(result.current.pendingAdminAction).toEqual(mockAction);
		});
	});

	describe("confirmAdminAction", () => {
		it("should do nothing if no pending action", async () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			await act(async () => {
				await result.current.confirmAdminAction();
			});

			expect(options.executeAction).not.toHaveBeenCalled();
		});

		it("should execute action and clear pending action on success", async () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(result.current.pendingAdminAction).toEqual(mockAction);

			await act(async () => {
				await result.current.confirmAdminAction();
			});

			expect(options.executeAction).toHaveBeenCalledWith(mockAction);
			expect(result.current.pendingAdminAction).toBeNull();
		});

		it("should clear pending action even if executeAction throws", async () => {
			const options = createDefaultOptions();
			const error = new Error("Failed");
			options.executeAction = vi.fn().mockRejectedValue(error);

			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			await act(async () => {
				try {
					await result.current.confirmAdminAction();
				} catch (e) {
					// Expected to throw
				}
			});

			expect(options.executeAction).toHaveBeenCalledWith(mockAction);
			expect(result.current.pendingAdminAction).toBeNull();
		});
	});

	describe("cancelAdminAction", () => {
		it("should clear pending action", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(result.current.pendingAdminAction).toEqual(mockAction);

			act(() => {
				result.current.cancelAdminAction();
			});

			expect(result.current.pendingAdminAction).toBeNull();
		});
	});

	describe("confirmActionName", () => {
		it("should return empty string if no pending action", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			expect(result.current.confirmActionName).toBe("");
		});

		it("should return the name of the pending action target", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(result.current.confirmActionName).toBe("Alice");
		});

		it("should return 'this name' as fallback if name not found", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction({
					...mockAction,
					nameId: "unknown-id",
				});
			});

			expect(result.current.confirmActionName).toBe("this name");
		});
	});

	describe("isPendingActionBusy", () => {
		it("should return false if no pending action", () => {
			const options = createDefaultOptions();
			const { result } = renderHook(() => useAdminActionConfirmation(options));

			expect(result.current.isPendingActionBusy).toBe(false);
		});

		it("should return the result of isBusy for the pending action", () => {
			const options = createDefaultOptions();
			options.isBusy = vi.fn().mockReturnValue(true);

			const { result } = renderHook(() => useAdminActionConfirmation(options));

			act(() => {
				result.current.requestAdminAction(mockAction);
			});

			expect(options.isBusy).toHaveBeenCalledWith(mockAction);
			expect(result.current.isPendingActionBusy).toBe(true);
		});
	});
});
