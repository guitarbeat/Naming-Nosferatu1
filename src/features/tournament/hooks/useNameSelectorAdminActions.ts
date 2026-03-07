import { useCallback, useMemo, useState } from "react";
import { coreAPI, hiddenNamesAPI } from "@/services/supabase/api";
import { withSupabase } from "@/services/supabase/runtime";
import type { IdType, NameItem } from "@/shared/types";

function isRpcSignatureError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("function") &&
		(normalized.includes("does not exist") ||
			normalized.includes("no function matches") ||
			normalized.includes("could not find"))
	);
}

export type PendingAdminAction = {
	type: "toggle-hidden" | "toggle-locked";
	nameId: IdType;
	isCurrentlyEnabled: boolean;
};

interface ToastApi {
	showWarning: (message: string) => void;
	showError: (message: string) => void;
	showSuccess: (message: string) => void;
}

interface UseNameSelectorAdminActionsParams {
	isAdmin: boolean;
	userName: string | null | undefined;
	toast: ToastApi;
	names: NameItem[];
	setNames: (names: NameItem[]) => void;
}

export function useNameSelectorAdminActions({
	isAdmin,
	userName,
	toast,
	names,
	setNames,
}: UseNameSelectorAdminActionsParams) {
	const [togglingHidden, setTogglingHidden] = useState<Set<IdType>>(new Set());
	const [togglingLocked, setTogglingLocked] = useState<Set<IdType>>(new Set());
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

	const handleToggleHidden = useCallback(
		async (nameId: IdType, isCurrentlyHidden: boolean) => {
			if (!isAdmin || !userName?.trim()) {
				return;
			}

			setTogglingHidden((prev) => {
				const next = new Set(prev);
				next.add(nameId);
				return next;
			});

			try {
				await withSupabase(async (_client) => {
					try {
						const client = await (
							await import("@/services/supabase/client")
						).resolveSupabaseClient();
						if (client) {
							await client.rpc("set_user_context", { user_name_param: userName.trim() });
						}
					} catch {
						/* ignore */
					}
				}, null);

				if (isCurrentlyHidden) {
					const result = await hiddenNamesAPI.unhideName(userName, nameId);
					if (!result.success) {
						throw new Error(result.error || "Failed to unhide name");
					}
				} else {
					const result = await hiddenNamesAPI.hideName(userName, nameId);
					if (!result.success) {
						throw new Error(result.error || "Failed to hide name");
					}
				}

				const fetchedNames = await coreAPI.getTrendingNames(true);
				setNames(fetchedNames);
				toast.showSuccess(isCurrentlyHidden ? "Name is visible again." : "Name is now hidden.");
			} catch (error) {
				console.error("Failed to toggle hidden status:", error);
				const detail = error instanceof Error ? error.message : "Unknown error";
				toast.showError(`Could not update hidden status: ${detail}`);
			} finally {
				setTogglingHidden((prev) => {
					const next = new Set(prev);
					next.delete(nameId);
					return next;
				});
			}
		},
		[userName, isAdmin, toast, setNames],
	);

	const handleToggleLocked = useCallback(
		async (nameId: IdType, isCurrentlyLocked: boolean) => {
			if (!isAdmin || !userName?.trim()) {
				return;
			}

			setTogglingLocked((prev) => {
				const next = new Set(prev);
				next.add(nameId);
				return next;
			});

			try {
				const result = await withSupabase(async (client) => {
					try {
						await client.rpc("set_user_context", { user_name_param: userName.trim() });
					} catch {
						/* ignore */
					}

					const canonicalArgs = {
						p_name_id: String(nameId),
						p_locked_in: !isCurrentlyLocked,
					};
					let rpcResult = await client.rpc("toggle_name_locked_in" as any, canonicalArgs);

					if (rpcResult.error && isRpcSignatureError(rpcResult.error.message || "")) {
						rpcResult = await client.rpc("toggle_name_locked_in" as any, {
							...canonicalArgs,
							p_user_name: userName.trim(),
						});
					}

					if (rpcResult.error) {
						throw new Error(rpcResult.error.message || "Failed to toggle locked status");
					}
					if (rpcResult.data !== true) {
						throw new Error("Failed to toggle locked status");
					}
					return rpcResult.data;
				}, null);

				if (result) {
					const fetchedNames = await coreAPI.getTrendingNames(true);
					setNames(fetchedNames);
					toast.showSuccess(isCurrentlyLocked ? "Name unlocked." : "Name locked in.");
				}
			} catch (error) {
				console.error("Failed to toggle locked status:", error);
				const detail = error instanceof Error ? error.message : "Unknown error";
				toast.showError(`Could not update lock state: ${detail}`);
			} finally {
				setTogglingLocked((prev) => {
					const next = new Set(prev);
					next.delete(nameId);
					return next;
				});
			}
		},
		[userName, isAdmin, toast, setNames],
	);

	const confirmActionName = useMemo(() => {
		if (!pendingAdminAction) {
			return "";
		}
		const target = names.find((name) => name.id === pendingAdminAction.nameId);
		return target?.name ?? "this name";
	}, [names, pendingAdminAction]);

	const isPendingAdminActionBusy = useMemo(() => {
		if (!pendingAdminAction) {
			return false;
		}
		if (pendingAdminAction.type === "toggle-hidden") {
			return togglingHidden.has(pendingAdminAction.nameId);
		}
		return togglingLocked.has(pendingAdminAction.nameId);
	}, [pendingAdminAction, togglingHidden, togglingLocked]);

	const handleConfirmAdminAction = useCallback(async () => {
		if (!pendingAdminAction) {
			return;
		}

		if (pendingAdminAction.type === "toggle-hidden") {
			await handleToggleHidden(pendingAdminAction.nameId, pendingAdminAction.isCurrentlyEnabled);
		} else {
			await handleToggleLocked(pendingAdminAction.nameId, pendingAdminAction.isCurrentlyEnabled);
		}

		setPendingAdminAction(null);
	}, [pendingAdminAction, handleToggleHidden, handleToggleLocked]);

	return {
		togglingHidden,
		togglingLocked,
		pendingAdminAction,
		setPendingAdminAction,
		requestAdminAction,
		confirmActionName,
		isPendingAdminActionBusy,
		handleConfirmAdminAction,
	};
}
