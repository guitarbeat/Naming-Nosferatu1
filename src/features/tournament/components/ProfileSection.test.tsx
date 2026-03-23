import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { forwardRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileInner } from "./ProfileSection";

const mockLogout = vi.fn();
const mockStore = {
	user: {
		name: "",
		isLoggedIn: false,
		avatarUrl: "",
	},
	userActions: {
		logout: mockLogout,
	},
};

vi.mock("@/store/appStore", () => ({
	default: () => mockStore,
}));

vi.mock("@/shared/components/layout", () => {
	return {
		Button: ({
			children,
			loading: _loading,
			...props
		}: React.ComponentProps<"button"> & { loading?: boolean }) => (
			<button type="button" {...props}>
				{children}
			</button>
		),
		Input: forwardRef<HTMLInputElement, React.ComponentProps<"input">>((props, ref) => (
			<input ref={ref} {...props} />
		)),
		Section: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
	};
});

describe("ProfileInner", () => {
	beforeEach(() => {
		mockLogout.mockReset();
		mockStore.user = {
			name: "",
			isLoggedIn: false,
			avatarUrl: "",
		};
	});

	it("does not autofocus the profile input for logged-out visitors", () => {
		render(<ProfileInner onLogin={vi.fn()} />);

		const input = screen.getByPlaceholderText("Who are you?");
		expect(input).not.toHaveAttribute("autofocus");
		expect(document.activeElement).not.toBe(input);
	});

	it("focuses the input when a logged-in user enters edit mode", () => {
		mockStore.user = {
			name: "Ada",
			isLoggedIn: true,
			avatarUrl: "",
		};

		render(<ProfileInner onLogin={vi.fn()} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit name" }));

		expect(screen.getByDisplayValue("Ada")).toHaveFocus();
	});
});
