import type { StateCreator } from "zustand";
import type { ErrorLog } from "@/shared/types";
import { IS_DEV, patch } from "@/store/storeUtils";
import type { AppState } from "@/store/types";

export const createErrorSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<AppState, "errors" | "errorActions">
> = (set, get) => ({
	errors: {
		current: null,
		history: [],
	},

	errorActions: {
		setError: (error) => {
			const log: ErrorLog | null = error
				? {
						error,
						context: "setError",
						metadata: {},
						timestamp: new Date().toISOString(),
					}
				: null;

			patch(set, "errors", {
				current: error,
				history: log ? [...get().errors.history, log] : get().errors.history,
			});
		},

		clearError: () => patch(set, "errors", { current: null }),

		logError: (error, context, metadata = {}) => {
			const entry: ErrorLog = {
				error,
				context,
				metadata,
				timestamp: new Date().toISOString(),
			};

			patch(set, "errors", {
				history: [...get().errors.history, entry],
			});

			if (IS_DEV) {
				console.error("[Store] Error logged:", entry);
			}
		},
	},
});
