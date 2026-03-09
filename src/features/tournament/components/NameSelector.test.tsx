import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NameSelector } from "./NameSelector";

const mocks = vi.hoisted(() => ({
	setSelection: vi.fn(),
	getTrendingNames: vi.fn(),
	setCachedData: vi.fn(),
	getCachedData: vi.fn(),
}));

vi.mock("@/app/providers/Providers", () => ({
	useToast: () => ({
		showWarning: vi.fn(),
		showError: vi.fn(),
		showSuccess: vi.fn(),
	}),
}));

vi.mock("@/store/appStore", () => ({
	default: (selector: (state: any) => any) =>
		selector({
			ui: { isSwipeMode: false },
			user: { isAdmin: false, name: "tester" },
			tournamentActions: { setSelection: mocks.setSelection },
		}),
}));

vi.mock("@/services/supabase/api", () => ({
	coreAPI: {
		getTrendingNames: mocks.getTrendingNames,
	},
}));

vi.mock("@/services/apiClient", () => ({
	api: { get: vi.fn() },
}));

vi.mock("@/shared/hooks", () => ({
	useNamesCache: () => ({
		getCachedData: mocks.getCachedData,
		setCachedData: mocks.setCachedData,
	}),
	useCollapsible: () => ({
		isCollapsed: true,
		toggle: vi.fn(),
		collapse: vi.fn(),
		expand: vi.fn(),
		set: vi.fn(),
	}),
}));

vi.mock("@/features/tournament/hooks/useNameSelectorAdminActions", () => ({
	useNameSelectorAdminActions: () => ({
		togglingHidden: new Set(),
		togglingLocked: new Set(),
		pendingAdminAction: null,
		setPendingAdminAction: vi.fn(),
		requestAdminAction: vi.fn(),
		confirmActionName: "",
		isPendingAdminActionBusy: false,
		handleConfirmAdminAction: vi.fn(),
	}),
}));

vi.mock("@/features/tournament/components/NameSelectorSwipeSection", () => ({
	NameSelectorSwipeSection: () => <div data-testid="swipe-section" />,
}));

vi.mock("@/features/tournament/components/NameSelectorGridSection", () => ({
	NameSelectorGridSection: (props: any) => (
		<div data-testid="grid-section">
			<button onClick={() => props.handleToggleName(props.names[0].id)} type="button">
				Toggle First
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/layout/Card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/layout/Button", () => ({
	default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/layout/Feedback/Loading", () => ({
	Loading: () => <div>Loading...</div>,
}));

vi.mock("@/shared/components/layout/ConfirmDialog", () => ({
	ConfirmDialog: () => null,
}));

vi.mock("@/shared/components/layout/Lightbox", () => ({
	Lightbox: () => null,
}));

describe("NameSelector", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getCachedData.mockReturnValue(null);
		mocks.getTrendingNames.mockResolvedValue([
			{
				id: 1,
				name: "Mittens",
				description: "A tiny chaos goblin.",
				lockedIn: false,
				locked_in: false,
				isHidden: false,
				is_hidden: false,
			},
		]);
	});

	it("loads names and syncs selection to the store", async () => {
		render(<NameSelector />);

		await waitFor(() => {
			expect(mocks.getTrendingNames).toHaveBeenCalledWith(true);
		});

		expect(screen.getByTestId("grid-section")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Toggle First" }));

		expect(mocks.setSelection).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ id: 1, name: "Mittens" })]),
		);
	});
});
