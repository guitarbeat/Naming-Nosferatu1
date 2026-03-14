import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AuthAdapter, Providers, useAuth, useToast } from "./Providers";

function createWrapper(adapter?: AuthAdapter) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <Providers auth={adapter ? { adapter } : undefined}>{children}</Providers>;
	};
}

describe("Providers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("throws a helpful error when useAuth is used outside Providers", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
			/* expected React error for hook misuse */
		});

		expect(() => renderHook(() => useAuth())).toThrow(/useAuth must be used within <Providers>/);

		consoleError.mockRestore();
	});

	it("throws a helpful error when useToast is used outside Providers", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
			/* expected React error for hook misuse */
		});

		expect(() => renderHook(() => useToast())).toThrow(/useToast must be used within <Providers>/);

		consoleError.mockRestore();
	});

	it("hydrates auth state from the injected adapter", async () => {
		const adapter: AuthAdapter = {
			checkAdminStatus: vi.fn().mockResolvedValue(true),
			getCurrentUser: vi.fn().mockResolvedValue({
				id: "user-1",
				name: "Ada",
				isAdmin: true,
			}),
			login: vi.fn().mockResolvedValue(true),
			logout: vi.fn().mockResolvedValue(undefined),
			register: vi.fn().mockResolvedValue(undefined),
		};

		const { result } = renderHook(() => useAuth(), {
			wrapper: createWrapper(adapter),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(adapter.getCurrentUser).toHaveBeenCalledTimes(1);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toMatchObject({
			id: "user-1",
			name: "Ada",
			isAdmin: true,
		});
	});

	it("renders toasts from the provider context", async () => {
		function ToastProbe() {
			const { showSuccess } = useToast();
			return (
				<button type="button" onClick={() => showSuccess("Saved successfully")}>
					Trigger toast
				</button>
			);
		}

		render(
			<Providers>
				<ToastProbe />
			</Providers>,
		);

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Trigger toast" }));
		});

		expect(await screen.findByRole("alert")).toHaveTextContent("Saved successfully");
	});
});
