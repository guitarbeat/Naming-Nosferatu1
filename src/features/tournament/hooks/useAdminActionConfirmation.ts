/**
 * @module useAdminActionConfirmation
 * @description Shared confirmation/authorization flow for admin actions.
 */

import { useCallback, useMemo, useState } from "react";

import type { IdType, NameItem } from "@/shared/types";

type AdminActionNotifier = {
	showWarning: (message: string) => string | undefined;
	showError: (message: string) => string | undefined;
};

export type PendingAdminAction = {
	type: "toggle-hidden" | "toggle-locked";
	nameId: IdType;
	isCurrentlyEnabled: boolean;
};

export interface UseAdminActionConfirmationOptions {
	isAdmin: boolean;
	userName: string | null | undefined;
	names: readonly NameItem[];
	toast: AdminActionNotifier;
	isBusy: (action: PendingAdminAction) => boolean;
	executeAction: (action: PendingAdminAction) => Promise<void>;
}

export interface UseAdminActionConfirmationResult {
	pendingAdminAction: PendingAdminAction | null;
	requestAdminAction: (action: PendingAdminAction) => void;
	confirmAdminAction: () => Promise<void>;
	cancelAdminAction: () => void;
	confirmActionName: string;
	isPendingActionBusy: boolean;
}

export function useAdminActionConfirmation({
	isAdmin,
	userName,
	names,
	toast,
	isBusy,
	executeAction,
}: UseAdminActionConfirmationOptions): UseAdminActionConfirmationResult {
	const [pendingAdminAction, setPendingAdminAction] = useState<PendingAdminAction | null>(null);

	const requestAdminAction = useCallback(
		(action: PendingAdminAction) => {
			if (!isAdmin) {
				toast.showWarning("Only admins can perform that action.");
				return;
			}

			if (!userName?.trim()) {
				toast.showError("Admin actions require a valid user session. Please log in again.");
				return;
			}

			setPendingAdminAction(action);
		},
		[isAdmin, toast, userName],
	);

	const confirmAdminAction = useCallback(async () => {
		if (!pendingAdminAction) {
			return;
		}

		try {
			await executeAction(pendingAdminAction);
		} finally {
			setPendingAdminAction(null);
		}
	}, [executeAction, pendingAdminAction]);

	const cancelAdminAction = useCallback(() => {
		setPendingAdminAction(null);
	}, []);

	const confirmActionName = useMemo(() => {
		if (!pendingAdminAction) {
			return "";
		}

		const target = names.find((name) => name.id === pendingAdminAction.nameId);
		return target?.name ?? "this name";
	}, [names, pendingAdminAction]);

	const isPendingActionBusy = useMemo(() => {
		if (!pendingAdminAction) {
			return false;
		}

		return isBusy(pendingAdminAction);
	}, [isBusy, pendingAdminAction]);

	return {
		pendingAdminAction,
		requestAdminAction,
		confirmAdminAction,
		cancelAdminAction,
		confirmActionName,
		isPendingActionBusy,
	};
}
